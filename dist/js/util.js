// 여러 화면에서 같이 쓰는 작은 도구들

// 화면에 넣는 모든 글자는 이걸로 이스케이프한다 (XSS 방지)
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 받침에 맞는 조사 고르기: josa("분노", "을/를") → "를", josa("불안", "으로/로") → "으로"
export function josa(word, pair) {
  const [withB, noB] = pair.split("/");
  const w = String(word);
  const code = w.charCodeAt(w.length - 1) - 0xAC00;
  if (code < 0 || code > 11171) return noB;
  const jong = code % 28;
  if (pair === "으로/로") return jong && jong !== 8 ? "으로" : "로";
  return jong ? withB : noB;
}

// 본문 글자를 문단으로 나눠 <p>로 만든다 (HTML은 쓰지 않는다)
export const paragraphs = text => String(text || "").split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  .map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

export const fmtDate = d => {
  const x = d instanceof Date ? d : new Date(d);
  return isNaN(x) ? "" : `${x.getFullYear()}.${String(x.getMonth() + 1).padStart(2, "0")}.${String(x.getDate()).padStart(2, "0")}`;
};
