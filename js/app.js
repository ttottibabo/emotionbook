// 방문자 화면(index.html): 글 목록, 글 보기, 마음으로 글 찾기(AI 또는 규칙)
import { DICT, EXAMPLES } from "./data.js";
import { ruleMatch, byEmotion, postsFor, EMOTIONS } from "./recommend.js";
import { logEvent, sendFeedback, loadPublished } from "./store.js";
import { aiEnabled, aiRecommend } from "./ai.js";
import { esc, josa, paragraphs, fmtDate } from "./util.js";

const $ = id => document.getElementById(id);
const out = $("out"), input = $("q");
let posts = [];
let filter = "전체";

if (aiEnabled) {
  $("mode-note").textContent = "AI(Claude)가 마음을 읽고";
  $("privacy").textContent = "입력한 문장은 감정을 읽기 위해 AI(Claude)에 보내지만, 이 블로그는 문장을 저장하지 않습니다. 어떤 감정으로 추천했는지만 익명으로 셉니다.";
}

const crisisBox = `<div class="notice crisis" role="alert">
  <p>많이 힘든 마음이 느껴집니다. 지금은 책보다 사람과 이야기하는 게 먼저입니다.</p>
  <p>한국에서는 자살예방 상담전화 <a href="tel:109"><strong>109</strong></a>로 24시간 연락할 수 있습니다. 믿을 수 있는 사람에게 지금 연락해 보는 것도 좋습니다.</p></div>`;

const card = (p, why, from) => `<li><a href="?p=${encodeURIComponent(p.id)}" data-post="${esc(p.id)}" data-from="${from}">
  <span class="chip">${esc(p.emotion)}</span>
  <strong class="title">${esc(p.title)}</strong>
  <span class="why">${esc(why ?? p.summary)}</span>
  <span class="date">${esc(fmtDate(p.date))}</span></a></li>`;

function bindCards(root) {
  root.querySelectorAll("[data-post]").forEach(a => a.addEventListener("click", e => {
    e.preventDefault();
    go({ p: a.dataset.post }, a.dataset.from);
  }));
}

/* ---------- 마음으로 글 찾기 ---------- */
function showResult({ emotion, picks, message = "", method, source, word = null, text = null }) {
  const how = method === "ai"
    ? `AI(Claude)가 문장 전체를 읽고 <strong>${esc(emotion)}</strong>${josa(emotion, "으로/로")} 이해한 뒤, 블로그 글 중에서 골랐습니다.`
    : word
      ? `“${esc(text)}”에서 <strong>“${esc(word)}”</strong>${josa(word, "을/를")} 찾아 <strong>${esc(emotion)}</strong>${josa(emotion, "으로/로")} 읽었습니다.`
      : `<strong>${esc(emotion)}</strong>${josa(emotion, "을/를")} 직접 골랐습니다.`;
  out.innerHTML = `<h2>지금 마음 · <span class="emo">${esc(emotion)}</span></h2>
    ${message ? `<p class="ai-msg">${esc(message)}</p>` : ""}
    <ul class="cards">${picks.map(x => card(x.post, x.why, "input")).join("")}</ul>
    <details class="how"><summary>어떻게 골랐나요?</summary><p>${how} 입력한 문장은 저장하지 않습니다.</p></details>
    <div class="actions">
      <div class="feedback" role="group" aria-label="추천 평가">
        <span>이 추천이 도움이 됐나요?</span>
        <button type="button" data-vote="up">👍 도움 됐어요</button>
        <button type="button" data-vote="down">👎 별로예요</button>
      </div>
      <button type="button" class="go share" id="share">이 감정의 글 공유하기</button>
    </div>
    <p class="toast" id="toast" aria-live="polite"></p>`;
  bindCards(out);
  out.querySelectorAll("[data-vote]").forEach(b => b.addEventListener("click", () => {
    out.querySelectorAll("[data-vote]").forEach(x => { x.disabled = true; });
    b.classList.add("picked");
    sendFeedback(emotion, b.dataset.vote, method);
    $("toast").textContent = "알려 주셔서 고마워요. 추천을 다듬는 데 씁니다.";
  }));
  $("share").addEventListener("click", () => share(`?emo=${encodeURIComponent(emotion)}`, `마음이 ‘${emotion}’일 때 읽기 좋은 책 이야기`, emotion));
  logEvent("recommend", { emotion, word, source, method });
}

const rulePicks = emotion => postsFor(emotion, posts).map(p => ({ post: p, why: p.summary }));
const showRule = (emotion, extra) => showResult({ emotion, picks: rulePicks(emotion), method: "rule", ...extra });

function showMiss(source) {
  out.innerHTML = `<div class="notice"><p><strong>감정을 찾지 못했어요.</strong> 아래에서 지금 마음과 가장 가까운 것을 골라 주세요.</p>
    <div class="list">${EMOTIONS.map(k => `<button type="button" data-k="${k}">${k}</button>`).join("")}</div></div>`;
  out.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => showRule(b.dataset.k, { source: "chip" })));
  logEvent("miss", { source, method: aiEnabled ? "ai" : "rule" });
}

async function run(raw, source = "input") {
  const text = raw.trim();
  const r = ruleMatch(text);
  if (r.empty) { out.innerHTML = ""; return; }
  // 위기 표현 검사는 AI보다 먼저, 규칙으로 (D-001)
  if (r.crisis) { out.innerHTML = crisisBox; logEvent("crisis", { source, method: "rule" }); return; }

  if (aiEnabled) {
    $("go").disabled = true;
    out.innerHTML = `<p class="muted">AI가 마음을 읽고 있어요…</p>`;
    const ai = await aiRecommend(text, posts);
    $("go").disabled = false;
    if (ai?.crisis) { out.innerHTML = crisisBox; logEvent("crisis", { source, method: "ai" }); return; }
    if (ai) {
      const byId = new Map(posts.map(p => [p.id, p]));
      let picks = ai.picks.map(x => ({ post: byId.get(x.id), why: x.why || byId.get(x.id).summary }));
      if (!picks.length) picks = rulePicks(ai.emotion);
      showResult({ emotion: ai.emotion, picks, message: ai.message, method: "ai", source });
      return;
    }
  }
  if (r.hit) showRule(r.hit.key, { word: r.word, text, source });
  else showMiss(source);
}

/* ---------- 글 목록과 글 보기 ---------- */
function renderList() {
  const shown = filter === "전체" ? posts : posts.filter(p => p.emotion === filter);
  $("posts").innerHTML = shown.map(p => card(p, null, "list")).join("") || `<li class="muted">아직 글이 없습니다.</li>`;
  bindCards($("posts"));
  $("filters").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === filter)));
}

function showPost(id, from) {
  const p = posts.find(x => x.id === id);
  const view = $("post-view");
  if (!p) { view.innerHTML = `<p><a href="./" id="back">← 모든 글</a></p><p>글을 찾을 수 없습니다.</p>`; }
  else {
    const others = postsFor(p.emotion, posts, 4).filter(x => x.id !== p.id).slice(0, 2);
    view.innerHTML = `<p><a href="./" id="back">← 모든 글</a></p>
      <p class="meta"><span class="chip">${esc(p.emotion)}</span> ${esc(fmtDate(p.date))}</p>
      <h1>${esc(p.title)}</h1>
      <p class="lede">${esc(p.summary)}</p>
      <div class="body">${paragraphs(p.body)}</div>
      ${p.books?.length ? `<h2>${p.seed ? "함께 읽을 책" : "이 글의 책"}</h2><ol class="books">${p.books.map(([t, a, why]) => `<li>
        <p class="title">${esc(t)}</p><p class="author">${esc(a)}</p>${why && !(!p.seed && why === p.summary) ? `<p class="why">${esc(why)}</p>` : ""}</li>`).join("")}</ol>` : ""}
      ${p.tags?.length ? `<p class="tags">${p.tags.map(t => `#${esc(t)}`).join(" ")}</p>` : ""}
      <div class="actions"><button type="button" class="go share" id="share">이 글 공유하기</button></div>
      <p class="toast" id="toast" aria-live="polite"></p>
      ${others.length ? `<h2>같은 마음의 다른 글</h2><ul class="cards">${others.map(o => card(o, null, "list")).join("")}</ul>` : ""}`;
    bindCards(view);
    $("share").addEventListener("click", () => share(`?p=${encodeURIComponent(p.id)}`, p.title, p.emotion));
    logEvent("view", { emotion: p.emotion, post: p.id, source: from });
  }
  $("back").addEventListener("click", e => { e.preventDefault(); go({}, null); });
}

function go(params, from, push = true) {
  const qs = new URLSearchParams(params).toString();
  if (push) history.pushState(params, "", qs ? `?${qs}` : location.pathname);
  render(from);
}

function render(from = "link") {
  const q = new URLSearchParams(location.search);
  const id = q.get("p");
  $("home-view").hidden = Boolean(id);
  $("post-view").hidden = !id;
  if (id) { showPost(id, from || "link"); window.scrollTo(0, 0); return; }
  document.title = "감정책 · 기분으로 찾는 책 블로그";
  const emo = q.get("emo");
  if (emo && byEmotion(emo) && from === "link") showRule(emo, { source: "link" });
}

async function share(query, text, emotion) {
  const url = `${location.origin}${location.pathname}${query}&utm_source=share`;
  let done = false;
  try {
    if (navigator.share) { await navigator.share({ title: "감정책", text, url }); done = true; }
    else { await navigator.clipboard.writeText(url); $("toast").textContent = "링크를 복사했어요. 친구에게 붙여 넣어 보세요."; done = true; }
  } catch { /* 사용자가 공유 창을 닫음 */ }
  if (done) logEvent("share", { emotion });
}

/* ---------- 시작 ---------- */
$("f").addEventListener("submit", e => { e.preventDefault(); run(input.value); });
EXAMPLES.forEach(t => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = t;
  b.addEventListener("click", () => { input.value = t; run(t); });
  $("examples").appendChild(b);
});
$("filters").innerHTML = ["전체", ...DICT.map(d => d.key)].map(k => `<button type="button" data-f="${k}">${k}</button>`).join("");
$("filters").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; renderList(); }));
$("home").addEventListener("click", e => { e.preventDefault(); go({}, null); });
window.addEventListener("popstate", () => render(null));

posts = await loadPublished();
renderList();
render("link");
document.body.dataset.ready = "1";
