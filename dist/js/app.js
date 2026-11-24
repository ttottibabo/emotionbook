// 사용자 화면(index.html) 동작
import { DICT, EXAMPLES } from "./data.js";
import { ruleMatch, byEmotion } from "./recommend.js";
import { logEvent, sendFeedback } from "./store.js";

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const out = $("out");
// 받침에 맞는 조사 고르기: josa("분노", "을/를") → "를"
function josa(word, pair) {
  const [withB, noB] = pair.split("/");
  const code = String(word).charCodeAt(String(word).length - 1) - 0xAC00;
  if (code < 0 || code > 11171) return noB;
  const jong = code % 28;
  if (pair === "으로/로") return jong && jong !== 8 ? "으로" : "로";
  return jong ? withB : noB;
}
const input = $("q");

const crisisBox = `<div class="notice crisis" role="alert">
  <p>많이 힘든 마음이 느껴집니다. 지금은 책보다 사람과 이야기하는 게 먼저입니다.</p>
  <p>한국에서는 자살예방 상담전화 <a href="tel:109"><strong>109</strong></a>로 24시간 연락할 수 있습니다. 믿을 수 있는 사람에게 지금 연락해 보는 것도 좋습니다.</p></div>`;

const bookList = books => `<ol class="books">${books.map(([title, author, why]) => `<li>
  <p class="title">${esc(title)}</p><p class="author">${esc(author)}</p><p class="why">${esc(why)}</p></li>`).join("")}</ol>`;

const chips = () => `<div class="list">${DICT.map(d => `<button type="button" data-k="${d.key}">${d.key}</button>`).join("")}</div>`;

function showEmotion(d, { word = null, text = null, source }) {
  const how = word
    ? `“${esc(text)}”에서 <strong>“${esc(word)}”</strong>${josa(word, "을/를")} 찾아 <strong>${d.key}</strong>${josa(d.key, "으로/로")} 읽었습니다.`
    : `<strong>${d.key}</strong>${josa(d.key, "을/를")} 직접 골랐습니다.`;
  out.innerHTML = `<h2>지금 마음 · <span class="emo">${d.key}</span></h2>
    ${bookList(d.books)}
    <details class="how"><summary>어떻게 골랐나요?</summary>
      <p>${how} 감정 ${DICT.length}가지마다 미리 고른 책 3권을 보여 줍니다. 입력한 문장은 저장하지 않습니다.</p></details>
    <div class="actions">
      <div class="feedback" role="group" aria-label="추천 평가">
        <span>이 추천이 도움이 됐나요?</span>
        <button type="button" data-vote="up">👍 도움 됐어요</button>
        <button type="button" data-vote="down">👎 별로예요</button>
      </div>
      <button type="button" class="go share" id="share">이 감정의 책 공유하기</button>
    </div>
    <p class="toast" id="toast" aria-live="polite"></p>`;

  out.querySelectorAll("[data-vote]").forEach(b => b.addEventListener("click", () => {
    out.querySelectorAll("[data-vote]").forEach(x => { x.disabled = true; });
    b.classList.add("picked");
    sendFeedback(d.key, b.dataset.vote);
    $("toast").textContent = "알려 주셔서 고마워요. 추천을 다듬는 데 씁니다.";
  }));
  $("share").addEventListener("click", () => share(d.key));
  logEvent("recommend", { emotion: d.key, word, source });
}

function run(raw, source = "input") {
  const text = raw.trim();
  const r = ruleMatch(text);
  if (r.empty) { out.innerHTML = ""; return; }
  if (r.crisis) { out.innerHTML = crisisBox; logEvent("crisis", { source }); return; }
  if (r.hit) { showEmotion(r.hit, { word: r.word, text, source }); return; }
  out.innerHTML = `<div class="notice"><p><strong>감정 단어를 찾지 못했어요.</strong> 아래에서 지금 마음과 가장 가까운 것을 골라 주세요.</p>${chips()}</div>`;
  out.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => showEmotion(byEmotion(b.dataset.k), { source: "chip" })));
  logEvent("miss", { source });
}

async function share(key) {
  const url = `${location.origin}${location.pathname}?emo=${encodeURIComponent(key)}&utm_source=share`;
  const data = { title: "감정책", text: `마음이 ‘${key}’일 때 읽기 좋은 책 3권`, url };
  let done = false;
  try {
    if (navigator.share) { await navigator.share(data); done = true; }
    else { await navigator.clipboard.writeText(url); $("toast").textContent = "링크를 복사했어요. 친구에게 붙여 넣어 보세요."; done = true; }
  } catch { /* 사용자가 공유 창을 닫음 */ }
  if (done) logEvent("share", { emotion: key });
}

$("f").addEventListener("submit", e => { e.preventDefault(); run(input.value); });

const ex = $("examples");
EXAMPLES.forEach(t => {
  const b = document.createElement("button");
  b.type = "button"; b.textContent = t;
  b.addEventListener("click", () => { input.value = t; run(t); });
  ex.appendChild(b);
});

// 공유 링크(?emo=불안)로 들어오면 그 감정의 책을 바로 보여 준다
const emo = new URLSearchParams(location.search).get("emo");
if (emo && byEmotion(emo)) showEmotion(byEmotion(emo), { source: "link" });
