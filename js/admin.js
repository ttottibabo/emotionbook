// 관리자 화면(admin.html): 로그인 → 운영자 확인 → 글쓰기(AI 발행 도우미) · 글 목록 · 지표
// admin.html?demo=1 은 Firebase 없이 예시 데이터로 모든 화면을 보여 준다 (발표·스크린샷용, 저장 안 됨).
import { EMOTIONS, localAssist } from "./recommend.js";
import { enabled, firebase, SDK, loadAllPosts, savePost, deletePost } from "./store.js";
import { SEED_POSTS } from "./posts.js";
import { aiEnabled, aiAssist } from "./ai.js";
import { esc, fmtDate } from "./util.js";

const $ = id => document.getElementById(id);
const view = $("view");
const DAY = 86400000;
const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–");
const mins = s => (s == null ? "–" : s < 60 ? `${Math.round(s)}초` : `${Math.round(s / 60)}분`);

/* ---------- 집계 (순수 함수) ---------- */
export function summarize(events, feedback, days, now = Date.now()) {
  const since = now - days * DAY;
  const ev = events.filter(e => e.ts >= since);
  const fb = feedback.filter(f => f.ts >= since);
  const count = t => ev.filter(e => e.type === t).length;
  const rec = count("recommend"), miss = count("miss");
  const byEmo = EMOTIONS.map(key => {
    const n = ev.filter(e => e.type === "recommend" && e.emotion === key).length;
    const up = fb.filter(f => f.emotion === key && f.vote === "up").length;
    const down = fb.filter(f => f.emotion === key && f.vote === "down").length;
    const shares = ev.filter(e => e.type === "share" && e.emotion === key).length;
    return { key, n, up, down, shares };
  }).sort((a, b) => b.n - a.n);
  const bySource = ["input", "chip", "link"].map(s => ({ s, n: ev.filter(e => e.type === "recommend" && e.source === s).length }));
  const byMethod = ["ai", "rule"].map(m => {
    const f = fb.filter(x => x.method === m);
    return { m, n: ev.filter(e => e.type === "recommend" && e.method === m).length, up: f.filter(x => x.vote === "up").length, votes: f.length };
  });
  const views = {};
  ev.filter(e => e.type === "view" && e.post).forEach(e => { views[e.post] = (views[e.post] || 0) + 1; });
  const topPosts = Object.entries(views).map(([post, n]) => ({ post, n })).sort((a, b) => b.n - a.n).slice(0, 5);
  const daily = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const start = new Date(now - (Math.min(days, 30) - 1 - i) * DAY); start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    return { date: start, n: ev.filter(e => e.type === "recommend" && e.ts >= t0 && e.ts < t0 + DAY).length };
  });
  const up = fb.filter(f => f.vote === "up").length;
  return {
    rec, miss, crisis: count("crisis"), shares: count("share"), views: count("view"),
    visitors: new Set(ev.map(e => e.sid)).size,
    up, votes: fb.length, byEmo, bySource, byMethod, topPosts, daily
  };
}

// 글쓰기 자동화 효과: AI 도움을 받은 글과 아닌 글의 작성 시간 비교
export function writingStats(posts) {
  const mine = posts.filter(p => !p.seed);
  const avg = list => { const t = list.map(p => p.editSeconds).filter(s => typeof s === "number" && s > 0); return t.length ? t.reduce((a, b) => a + b, 0) / t.length : null; };
  const ai = mine.filter(p => p.aiUsed), manual = mine.filter(p => !p.aiUsed);
  const avgAi = avg(ai), avgManual = avg(manual);
  return {
    total: mine.length, published: mine.filter(p => p.status === "published").length,
    ai: ai.length, manual: manual.length, avgAi, avgManual,
    saved: avgAi != null && avgManual != null ? Math.max(0, 1 - avgAi / avgManual) : null
  };
}

/* ---------- 상태 ---------- */
const ctx = { demo: false, h: null, user: null, posts: [], events: [], feedback: [], tab: "write", editing: null };
const allPosts = () => [...ctx.posts, ...SEED_POSTS];

function showTab(tab) {
  ctx.tab = tab;
  $("tabs").querySelectorAll("button").forEach(b => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
  ({ write: renderWrite, list: renderList, stats: () => renderStats(30) })[tab]();
}

/* ---------- 글쓰기: AI 발행 도우미 ---------- */
function renderWrite() {
  const p = ctx.editing || {};
  const v = k => esc(p[k] ?? "");
  view.innerHTML = `
    <h1>${p.id ? "글 고치기" : "새 글 쓰기"}</h1>
    <p class="lede">책 제목과 메모만 적고 <strong>AI로 나머지 채우기</strong>를 누르면 제목, 요약, 감정, 태그, 검색 설명, 본문 정리, 인스타 카드 문구를 한 번에 만듭니다. 확인하고 고친 뒤 발행하세요.</p>
    <form id="editor" class="editor" autocomplete="off">
      <fieldset><legend>1. 내가 쓰는 부분</legend>
        <div class="row2">
          <label>책 제목<input id="bookTitle" value="${v("bookTitle")}" maxlength="60" required></label>
          <label>저자<input id="bookAuthor" value="${v("bookAuthor")}" maxlength="40"></label>
        </div>
        <label><span>메모·초안 <span class="muted">(읽으며 든 생각을 자유롭게)</span></span>
          <textarea id="notes" rows="7" maxlength="6000">${v("body")}</textarea></label>
        <div class="assist-row">
          <button type="button" class="go" id="assist">✨ AI로 나머지 채우기</button>
          <span id="assist-note" class="muted" aria-live="polite">${aiEnabled && !ctx.demo ? "" : "AI 미연결: 규칙으로 예시를 채웁니다."}</span>
        </div>
      </fieldset>
      <fieldset><legend>2. AI가 채우는 부분 <span class="muted">(고칠 수 있어요)</span></legend>
        <label>글 제목<input id="title" value="${v("title")}" maxlength="60"></label>
        <label>한 줄 요약<input id="summary" value="${v("summary")}" maxlength="120"></label>
        <div class="row2">
          <label>감정<select id="emotion"><option value="">고르기</option>${EMOTIONS.map(k => `<option${p.emotion === k ? " selected" : ""}>${k}</option>`).join("")}</select></label>
          <label><span>태그 <span class="muted">(쉼표로 구분)</span></span><input id="tags" value="${esc((p.tags || []).join(", "))}" maxlength="120"></label>
        </div>
        <label><span>검색 설명 <span class="muted" id="desc-count"></span></span><input id="description" value="${v("description")}" maxlength="90"></label>
        <label>본문<textarea id="body" rows="9" maxlength="6000">${v("body")}</textarea></label>
        <label>인스타 카드 문구<textarea id="card" rows="5" maxlength="400">${v("card")}</textarea></label>
        <button type="button" class="ghost" id="copy-card">카드 문구 복사</button>
      </fieldset>
      <div class="actions">
        <div class="assist-row">
          <button type="button" class="ghost" id="draft">초안 저장</button>
          <button type="submit" class="go" id="publish">발행</button>
          ${p.id ? `<button type="button" class="ghost" id="cancel">새 글로</button>` : ""}
        </div>
        <span id="save-note" class="muted" aria-live="polite"></span>
      </div>
    </form>`;

  // 작성 시간: 처음 입력한 순간부터 저장할 때까지 (자동화 효과를 재는 지표)
  let started = null, aiUsed = Boolean(p.aiUsed);
  const form = $("editor");
  form.addEventListener("input", () => { if (!started) started = Date.now(); descCount(); });
  const descCount = () => { $("desc-count").textContent = `(${$("description").value.length}/90)`; };
  descCount();

  $("assist").addEventListener("click", async () => {
    if (!started) started = Date.now();
    const draft = { bookTitle: $("bookTitle").value.trim(), bookAuthor: $("bookAuthor").value.trim(), notes: $("notes").value.trim() };
    if (!draft.bookTitle || !draft.notes) { $("assist-note").textContent = "책 제목과 메모를 먼저 적어 주세요."; return; }
    $("assist").disabled = true; $("assist-note").textContent = "만드는 중…";
    let r = null;
    if (aiEnabled && !ctx.demo) {
      try { r = await aiAssist(draft, await ctx.user.getIdToken()); aiUsed = true; $("assist-note").textContent = "AI가 채웠습니다. 확인하고 고쳐 주세요."; }
      catch (err) { $("assist-note").textContent = `AI 호출 실패(${err.message}). 규칙으로 대신 채웠습니다.`; }
    }
    if (!r) { r = localAssist(draft); if (!aiEnabled || ctx.demo) $("assist-note").textContent = "AI 미연결: 규칙으로 만든 예시입니다."; }
    for (const k of ["title", "summary", "description", "body", "card"]) if (r[k]) $(k).value = r[k];
    if (r.emotion) $("emotion").value = r.emotion;
    if (r.tags.length) $("tags").value = r.tags.join(", ");
    descCount();
    $("assist").disabled = false;
  });

  $("copy-card").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("card").value); $("save-note").textContent = "카드 문구를 복사했어요."; } catch { $("save-note").textContent = "복사하지 못했어요. 직접 선택해 복사해 주세요."; }
  });
  $("cancel")?.addEventListener("click", () => { ctx.editing = null; renderWrite(); });

  const save = async status => {
    const data = {
      title: $("title").value.trim(), summary: $("summary").value.trim(), emotion: $("emotion").value,
      tags: $("tags").value.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 6),
      description: $("description").value.trim(), card: $("card").value.trim(), body: $("body").value.trim(),
      bookTitle: $("bookTitle").value.trim(), bookAuthor: $("bookAuthor").value.trim(),
      status, aiUsed,
      editSeconds: Math.round(((p.editSeconds || 0) * 1000 + (started ? Date.now() - started : 0)) / 1000)
    };
    if (status === "published" && (!data.title || !data.emotion || !data.body || !data.summary)) {
      $("save-note").textContent = "발행하려면 글 제목, 한 줄 요약, 감정, 본문이 필요합니다."; return;
    }
    if (!data.title) data.title = data.bookTitle || "제목 없음";
    $("save-note").textContent = "저장하는 중…";
    try {
      if (ctx.demo) {
        const id = p.id || `demo-${Date.now()}`;
        const post = { ...data, id, date: new Date().toISOString().slice(0, 10), createdMs: Date.now(), books: [[data.bookTitle, data.bookAuthor, data.summary]], seed: false };
        ctx.posts = [post, ...ctx.posts.filter(x => x.id !== id)];
      } else {
        await savePost(ctx.h, p.id, data);
        ctx.posts = await loadAllPosts(ctx.h);
      }
      ctx.editing = null;
      renderWrite();
      $("save-note").textContent = `${status === "published" ? "발행했습니다" : "초안으로 저장했습니다"} · 작성 시간 ${mins(data.editSeconds)}${ctx.demo ? " · 예시 모드라 새로고침하면 사라집니다" : ""}`;
    } catch (err) { $("save-note").textContent = `저장하지 못했습니다: ${err.message || err}`; }
  };
  $("draft").addEventListener("click", () => save("draft"));
  form.addEventListener("submit", e => { e.preventDefault(); save("published"); });
}

/* ---------- 글 목록 ---------- */
function renderList() {
  const w = writingStats(ctx.posts);
  view.innerHTML = `
    <h1>글 목록</h1>
    <p class="muted">내가 쓴 글 ${w.total}편 (발행 ${w.published}) · AI 도움 ${w.ai}편 · 기본 글 ${SEED_POSTS.length}편은 js/posts.js에서 고칩니다.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>제목</th><th>감정</th><th>상태</th><th>날짜</th><th>AI</th><th class="num">작성 시간</th><th></th></tr></thead>
      <tbody>${ctx.posts.map(p => `<tr>
        <td class="wrap">${esc(p.title)}</td><td>${esc(p.emotion || "–")}</td>
        <td>${p.status === "published" ? "발행" : "초안"}</td><td>${esc(fmtDate(p.date))}</td><td>${p.aiUsed ? "✨" : ""}</td><td class="num">${mins(p.editSeconds)}</td>
        <td class="row-actions"><button type="button" data-edit="${esc(p.id)}">고치기</button>
          <button type="button" data-toggle="${esc(p.id)}">${p.status === "published" ? "내리기" : "발행"}</button>
          <button type="button" data-del="${esc(p.id)}">삭제</button></td></tr>`).join("") || `<tr><td colspan="7" class="muted">아직 쓴 글이 없습니다. 글쓰기 탭에서 첫 글을 써 보세요.</td></tr>`}</tbody>
    </table></div>
    <h2>기본 글</h2>
    <ul class="plain">${SEED_POSTS.map(p => `<li>${esc(p.emotion)} · ${esc(p.title)}</li>`).join("")}</ul>`;
  const find = id => ctx.posts.find(p => p.id === id);
  view.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => { ctx.editing = find(b.dataset.edit); showTab("write"); }));
  view.querySelectorAll("[data-toggle]").forEach(b => b.addEventListener("click", async () => {
    const p = find(b.dataset.toggle), status = p.status === "published" ? "draft" : "published";
    if (status === "published" && (!p.title || !p.emotion || !p.body || !p.summary)) { alert("제목, 요약, 감정, 본문을 채운 뒤 발행할 수 있습니다."); return; }
    if (ctx.demo) p.status = status;
    else { await savePost(ctx.h, p.id, { ...p, status }); ctx.posts = await loadAllPosts(ctx.h); }
    renderList();
  }));
  view.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    const p = find(b.dataset.del);
    if (!confirm(`“${p.title}” 글을 삭제할까요? 되돌릴 수 없습니다.`)) return;
    if (ctx.demo) ctx.posts = ctx.posts.filter(x => x.id !== p.id);
    else { await deletePost(ctx.h, p.id); ctx.posts = await loadAllPosts(ctx.h); }
    renderList();
  }));
}

/* ---------- 지표 ---------- */
function renderStats(days) {
  const s = summarize(ctx.events, ctx.feedback, days);
  const w = writingStats(ctx.posts);
  const max = Math.max(1, ...s.byEmo.map(e => e.n));
  const dmax = Math.max(1, ...s.daily.map(d => d.n));
  const srcName = { input: "직접 입력", chip: "감정 목록에서 선택", link: "공유 링크" };
  const methodName = { ai: "AI(Claude)", rule: "규칙" };
  const titleOf = id => (allPosts().find(p => p.id === id) || { title: id }).title;
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  view.innerHTML = `
    <div class="bar-top"><h1>지표</h1>
      <label>기간 <select id="days">${[7, 30, 90].map(d => `<option value="${d}"${d === days ? " selected" : ""}>최근 ${d}일</option>`).join("")}</select></label></div>

    <h2>독자</h2>
    <div class="kpis">
      <div class="kpi"><p class="label">추천 수</p><p class="num">${s.rec}</p><p class="sub">방문 ${s.visitors}회</p></div>
      <div class="kpi"><p class="label">만족도 (👍 비율)</p><p class="num">${pct(s.up, s.votes)}</p><p class="sub">평가 ${s.votes}건 · 목표 70%</p></div>
      <div class="kpi"><p class="label">감정 못 찾음</p><p class="num">${pct(s.miss, s.rec + s.miss)}</p><p class="sub">${s.miss}건 · 목표 20% 이하</p></div>
      <div class="kpi"><p class="label">글 조회</p><p class="num">${s.views}</p><p class="sub">공유 ${s.shares}건</p></div>
      <div class="kpi"><p class="label">위기 안내 표시</p><p class="num">${s.crisis}</p><p class="sub">109 안내로 연결</p></div>
    </div>

    <h2>관리자 글쓰기 자동화</h2>
    <div class="kpis">
      <div class="kpi"><p class="label">AI 도움 받은 글</p><p class="num">${w.ai}</p><p class="sub">전체 ${w.total}편 중</p></div>
      <div class="kpi"><p class="label">평균 작성 시간 (AI)</p><p class="num">${mins(w.avgAi)}</p><p class="sub">직접 작성 ${mins(w.avgManual)}</p></div>
      <div class="kpi"><p class="label">줄어든 시간</p><p class="num">${w.saved == null ? "–" : Math.round(w.saved * 100) + "%"}</p><p class="sub">목표 50% 이상</p></div>
    </div>

    <h2>추천 방식 비교</h2>
    <div class="table-wrap"><table><thead><tr><th>방식</th><th class="num">추천</th><th class="num">평가</th><th class="num">만족도</th></tr></thead>
      <tbody>${s.byMethod.map(x => `<tr><td>${methodName[x.m]}</td><td class="num">${x.n}</td><td class="num">${x.votes}</td><td class="num">${pct(x.up, x.votes)}</td></tr>`).join("")}</tbody></table></div>

    <h2>하루 추천 수</h2>
    <div class="days" aria-label="하루 추천 수 막대">${s.daily.map(d => `<div style="height:${(d.n / dmax) * 100}%" title="${fmt(d.date)} · ${d.n}건"></div>`).join("")}</div>
    <div class="days-axis"><span>${fmt(s.daily[0].date)}</span><span>${fmt(s.daily[s.daily.length - 1].date)}</span></div>

    <h2>많이 본 글</h2>
    <div class="table-wrap"><table><tbody>${s.topPosts.map((x, i) => `<tr><td>${i + 1}</td><td class="wrap">${esc(titleOf(x.post))}</td><td class="num">${x.n}</td></tr>`).join("") || `<tr><td class="muted">아직 조회 기록이 없습니다.</td></tr>`}</tbody></table></div>

    <h2>감정별 추천과 만족도</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>감정</th><th class="num">추천</th><th></th><th class="num">👍</th><th class="num">👎</th><th class="num">만족도</th><th class="num">공유</th></tr></thead>
      <tbody>${s.byEmo.map(e => `<tr><td>${esc(e.key)}</td><td class="num">${e.n}</td>
        <td><span class="bar" style="width:${(e.n / max) * 8}rem"></span></td>
        <td class="num">${e.up}</td><td class="num">${e.down}</td><td class="num">${pct(e.up, e.up + e.down)}</td><td class="num">${e.shares}</td></tr>`).join("")}</tbody>
    </table></div>

    <h2>추천이 시작된 경로</h2>
    <div class="table-wrap"><table><tbody>${s.bySource.map(x => `<tr><td>${srcName[x.s]}</td><td class="num">${x.n}</td><td class="num">${pct(x.n, s.rec)}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted">독자가 입력한 문장은 저장하지 않으므로 여기에는 감정 이름과 횟수만 나옵니다.</p>`;
  $("days").addEventListener("change", e => renderStats(Number(e.target.value)));
}

/* ---------- 예시 데이터 (같은 결과가 나오도록 고정된 난수) ---------- */
export function demoData(now = Date.now()) {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const weights = [9, 14, 6, 5, 7, 12, 4, 3, 3, 5, 4, 3];
  const total = weights.reduce((a, b) => a + b, 0);
  const pick = () => { let r = rnd() * total; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return EMOTIONS[i]; } return EMOTIONS[0]; };
  const posts = [
    { id: "demo-1", title: "불안한 밤에 다시 읽은 『불안』", emotion: "불안", status: "published", aiUsed: true, editSeconds: 540, summary: "불안을 없애기보다 이해하는 쪽을 택하게 된 기록", body: "예시 글입니다.", bookTitle: "불안", bookAuthor: "알랭 드 보통" },
    { id: "demo-2", title: "지친 주말, 『월든』의 느린 문장들", emotion: "지침", status: "published", aiUsed: true, editSeconds: 660, summary: "속도를 늦추는 연습", body: "예시 글입니다.", bookTitle: "월든", bookAuthor: "헨리 데이비드 소로" },
    { id: "demo-3", title: "『아몬드』를 읽고 쓴 짧은 메모", emotion: "슬픔", status: "published", aiUsed: false, editSeconds: 1680, summary: "감정을 배운다는 것", body: "예시 글입니다.", bookTitle: "아몬드", bookAuthor: "손원평" },
    { id: "demo-4", title: "『모모』와 내 시간", emotion: "두려움", status: "draft", aiUsed: false, editSeconds: 1500, summary: "", body: "예시 초안입니다.", bookTitle: "모모", bookAuthor: "미하엘 엔데" }
  ].map((p, i) => ({ ...p, date: new Date(now - (i * 5 + 2) * DAY).toISOString().slice(0, 10), createdMs: now - (i * 5 + 2) * DAY, seed: false, tags: [p.emotion, p.bookTitle] }));
  const postIds = [...posts.filter(p => p.status === "published").map(p => p.id), ...SEED_POSTS.map(p => p.id)];
  const events = [], feedback = [];
  for (let i = 0; i < 640; i++) {
    const ts = now - Math.floor(Math.pow(rnd(), 0.8) * 30 * DAY), sid = "s" + Math.floor(i / 1.6), r = rnd();
    const method = rnd() < 0.7 ? "ai" : "rule";
    if (r < 0.006) { events.push({ type: "crisis", sid, ts }); continue; }
    if (r < 0.006 + (method === "ai" ? 0.04 : 0.18)) { events.push({ type: "miss", method, sid, ts }); continue; }
    const emotion = pick(), source = rnd() < 0.72 ? "input" : rnd() < 0.6 ? "chip" : "link";
    events.push({ type: "recommend", emotion, source, method, sid, ts });
    if (rnd() < 0.55) events.push({ type: "view", post: postIds[Math.floor(Math.pow(rnd(), 2) * postIds.length)], emotion, sid, ts });
    if (rnd() < 0.3) feedback.push({ emotion, method, vote: rnd() < (method === "ai" ? 0.82 : 0.68) ? "up" : "down", ts });
    if (rnd() < 0.08) events.push({ type: "share", emotion, sid, ts });
  }
  return { posts, events, feedback };
}

/* ---------- 시작: 예시 모드 또는 Firebase 로그인 ---------- */
function ready() {
  $("tabs").hidden = false;
  $("tabs").querySelectorAll("button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  const t = new URLSearchParams(location.search).get("tab");
  showTab(["write", "list", "stats"].includes(t) ? t : "write");
}

async function load(h, days = 90) {
  const fs = h.fs, since = fs.Timestamp.fromMillis(Date.now() - days * DAY);
  const get = async name => (await fs.getDocs(fs.query(fs.collection(h.db, name), fs.where("ts", ">=", since), fs.orderBy("ts", "desc"), fs.limit(10000))))
    .docs.map(d => { const x = d.data(); return { ...x, ts: x.ts ? x.ts.toMillis() : 0 }; });
  const [events, feedback, posts] = await Promise.all([get("events"), get("feedback"), loadAllPosts(h)]);
  return { events, feedback, posts };
}

async function start() {
  if (new URLSearchParams(location.search).has("demo")) {
    Object.assign(ctx, { demo: true }, demoData());
    $("who").innerHTML = `<span class="demo-badge">예시 데이터 · 저장 안 됨</span>`;
    ready();
    return;
  }
  if (!enabled) {
    view.innerHTML = `<div class="notice"><p><strong>Firebase가 아직 연결되지 않았습니다.</strong> js/firebase-config.js에 프로젝트 값을 넣으면 로그인해서 글을 쓰고 지표를 볼 수 있습니다.</p>
      <p><a href="?demo=1">예시 데이터로 관리자 화면 둘러보기</a></p></div>`;
    return;
  }
  const h = await firebase();
  if (!h) { view.innerHTML = `<div class="notice"><p>Firebase에 연결하지 못했습니다. 네트워크를 확인해 주세요.</p></div>`; return; }
  const auth = await import(SDK + "firebase-auth.js");
  const a = auth.getAuth(h.app);
  auth.onAuthStateChanged(a, async user => {
    if (!user) { $("who").textContent = ""; $("tabs").hidden = true; return showLogin(auth, a); }
    $("who").innerHTML = `${esc(user.email)} · <a href="#" id="logout">로그아웃</a>`;
    $("logout").addEventListener("click", e => { e.preventDefault(); auth.signOut(a); });
    const admin = await h.fs.getDoc(h.fs.doc(h.db, "admins", user.uid)).catch(() => null);
    if (!admin || !admin.exists()) {
      view.innerHTML = `<div class="notice"><p>관리자로 등록되지 않은 계정입니다.</p><p class="muted">Firebase 콘솔에서 admins 컬렉션에 문서 ID <code>${esc(user.uid)}</code>를 추가하세요.</p></div>`;
      return;
    }
    view.innerHTML = `<p class="muted">불러오는 중…</p>`;
    try { Object.assign(ctx, { h, user }, await load(h)); ready(); }
    catch (err) { view.innerHTML = `<div class="notice"><p>기록을 읽지 못했습니다: ${esc(err.message || err)}</p></div>`; }
  });
}

function showLogin(auth, a) {
  view.innerHTML = `<form class="login" id="login">
      <h1>관리자 로그인</h1>
      <label>이메일 <input id="em" type="email" autocomplete="username" required></label>
      <label>비밀번호 <input id="pw" type="password" autocomplete="current-password" required></label>
      <button class="go" type="submit">로그인</button><p class="muted" id="err"></p></form>`;
  $("login").addEventListener("submit", async e => {
    e.preventDefault();
    try { await auth.signInWithEmailAndPassword(a, $("em").value, $("pw").value); }
    catch { $("err").textContent = "로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요."; }
  });
}

if (document.getElementById("view")) start();
