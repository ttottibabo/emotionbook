// 운영자 화면(admin.html): 로그인 → 운영자 확인 → 지표 집계
// admin.html?demo=1 은 Firebase 없이 예시 데이터로 화면만 보여 준다 (발표·스크린샷용).
import { EMOTIONS } from "./recommend.js";
import { enabled, firebase } from "./store.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const view = $("view");
const DAY = 86400000;
const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–");

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
  const daily = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const start = new Date(now - (Math.min(days, 30) - 1 - i) * DAY); start.setHours(0, 0, 0, 0);
    const t0 = start.getTime();
    return { date: start, n: ev.filter(e => e.type === "recommend" && e.ts >= t0 && e.ts < t0 + DAY).length };
  });
  const up = fb.filter(f => f.vote === "up").length;
  return {
    rec, miss, crisis: count("crisis"), shares: count("share"),
    visitors: new Set(ev.map(e => e.sid)).size,
    up, votes: fb.length, byEmo, bySource, daily
  };
}

/* ---------- 화면 ---------- */
function render(events, feedback, days, note = "") {
  const s = summarize(events, feedback, days);
  const max = Math.max(1, ...s.byEmo.map(e => e.n));
  const dmax = Math.max(1, ...s.daily.map(d => d.n));
  const srcName = { input: "직접 입력", chip: "감정 목록에서 선택", link: "공유 링크" };
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
  view.innerHTML = `
    <div class="bar-top">
      <label>기간 <select id="days">${[7, 30, 90].map(d => `<option value="${d}"${d === days ? " selected" : ""}>최근 ${d}일</option>`).join("")}</select></label>
      ${note}
    </div>
    <div class="kpis">
      <div class="kpi"><p class="label">추천 수</p><p class="num">${s.rec}</p><p class="sub">방문 ${s.visitors}회</p></div>
      <div class="kpi"><p class="label">만족도 (👍 비율)</p><p class="num">${pct(s.up, s.votes)}</p><p class="sub">평가 ${s.votes}건 · 목표 70%</p></div>
      <div class="kpi"><p class="label">감정 못 찾음</p><p class="num">${pct(s.miss, s.rec + s.miss)}</p><p class="sub">${s.miss}건 · 목표 20% 이하</p></div>
      <div class="kpi"><p class="label">공유</p><p class="num">${s.shares}</p><p class="sub">추천 대비 ${pct(s.shares, s.rec)}</p></div>
      <div class="kpi"><p class="label">위기 안내 표시</p><p class="num">${s.crisis}</p><p class="sub">109 안내로 연결</p></div>
    </div>

    <h2>하루 추천 수</h2>
    <div class="days" aria-label="하루 추천 수 막대">${s.daily.map(d => `<div style="height:${(d.n / dmax) * 100}%" title="${fmt(d.date)} · ${d.n}건"></div>`).join("")}</div>
    <div class="days-axis"><span>${fmt(s.daily[0].date)}</span><span>${fmt(s.daily[s.daily.length - 1].date)}</span></div>

    <h2>감정별 추천과 만족도</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>감정</th><th class="num">추천</th><th></th><th class="num">👍</th><th class="num">👎</th><th class="num">만족도</th><th class="num">공유</th></tr></thead>
      <tbody>${s.byEmo.map(e => `<tr><td>${esc(e.key)}</td><td class="num">${e.n}</td>
        <td><span class="bar" style="width:${(e.n / max) * 8}rem"></span></td>
        <td class="num">${e.up}</td><td class="num">${e.down}</td><td class="num">${pct(e.up, e.up + e.down)}</td><td class="num">${e.shares}</td></tr>`).join("")}</tbody>
    </table></div>

    <h2>추천이 시작된 경로</h2>
    <div class="table-wrap"><table><tbody>${s.bySource.map(x => `<tr><td>${srcName[x.s]}</td><td class="num">${x.n}</td><td class="num">${pct(x.n, s.rec)}</td></tr>`).join("")}</tbody></table></div>
    <p class="muted">입력 문장은 저장하지 않으므로 여기에는 감정 이름과 횟수만 나옵니다. 책 목록은 js/data.js에서 고칩니다.</p>`;
  $("days").addEventListener("change", e => render(events, feedback, Number(e.target.value), note));
}

/* ---------- 예시 데이터 (같은 결과가 나오도록 고정된 난수) ---------- */
function demoData() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const weights = [9, 14, 6, 5, 7, 12, 4, 3, 3, 5, 4, 3];
  const total = weights.reduce((a, b) => a + b, 0);
  const pick = () => { let r = rnd() * total; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return EMOTIONS[i]; } return EMOTIONS[0]; };
  const events = [], feedback = [], now = Date.now();
  for (let i = 0; i < 640; i++) {
    const ts = now - Math.floor(Math.pow(rnd(), 0.8) * 30 * DAY), sid = "s" + Math.floor(i / 1.6), r = rnd();
    if (r < 0.15) { events.push({ type: "miss", sid, ts }); continue; }
    if (r < 0.155) { events.push({ type: "crisis", sid, ts }); continue; }
    const emotion = pick(), source = rnd() < 0.72 ? "input" : rnd() < 0.6 ? "chip" : "link";
    events.push({ type: "recommend", emotion, source, sid, ts });
    if (rnd() < 0.3) feedback.push({ emotion, vote: rnd() < (emotion === "분노" ? 0.45 : 0.78) ? "up" : "down", ts });
    if (rnd() < 0.08) events.push({ type: "share", emotion, sid, ts });
  }
  return { events, feedback };
}

/* ---------- Firebase 로그인과 데이터 읽기 ---------- */
async function load(h, days = 90) {
  const fs = h.fs, since = fs.Timestamp.fromMillis(Date.now() - days * DAY);
  const get = async name => (await fs.getDocs(fs.query(fs.collection(h.db, name), fs.where("ts", ">=", since), fs.orderBy("ts", "desc"), fs.limit(10000))))
    .docs.map(d => { const x = d.data(); return { ...x, ts: x.ts ? x.ts.toMillis() : 0 }; });
  return { events: await get("events"), feedback: await get("feedback") };
}

async function start() {
  if (new URLSearchParams(location.search).has("demo")) {
    const { events, feedback } = demoData();
    $("who").innerHTML = `<span class="demo-badge">예시 데이터 · 실제 기록 아님</span>`;
    render(events, feedback, 30);
    return;
  }
  if (!enabled) {
    view.innerHTML = `<div class="notice"><p><strong>Firebase가 아직 연결되지 않았습니다.</strong> js/firebase-config.js에 프로젝트 값을 넣으면 실제 기록을 볼 수 있습니다.</p>
      <p><a href="?demo=1">예시 데이터로 화면 보기</a></p></div>`;
    return;
  }
  const h = await firebase();
  if (!h) { view.innerHTML = `<div class="notice"><p>Firebase에 연결하지 못했습니다. 네트워크를 확인해 주세요.</p></div>`; return; }
  const auth = await import(SDK + "firebase-auth.js");
  const a = auth.getAuth(h.app);
  auth.onAuthStateChanged(a, async user => {
    if (!user) { $("who").textContent = ""; return showLogin(auth, a); }
    $("who").innerHTML = `${esc(user.email)} · <a href="#" id="out">로그아웃</a>`;
    $("out").addEventListener("click", e => { e.preventDefault(); auth.signOut(a); });
    const admin = await h.fs.getDoc(h.fs.doc(h.db, "admins", user.uid)).catch(() => null);
    if (!admin || !admin.exists()) {
      view.innerHTML = `<div class="notice"><p>운영자로 등록되지 않은 계정입니다.</p><p class="muted">Firebase 콘솔에서 admins 컬렉션에 문서 ID <code>${esc(user.uid)}</code>를 추가하세요.</p></div>`;
      return;
    }
    view.innerHTML = `<p class="muted">기록을 불러오는 중…</p>`;
    try { const { events, feedback } = await load(h); render(events, feedback, 30); }
    catch (err) { view.innerHTML = `<div class="notice"><p>기록을 읽지 못했습니다: ${esc(err.message || err)}</p></div>`; }
  });
}

function showLogin(auth, a) {
  view.innerHTML = `<form class="login" id="login">
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
