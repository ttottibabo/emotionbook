// Claude AI 호출 (브라우저 → Cloudflare Worker → Claude). 키는 Worker에만 있다.
import { AI_ENDPOINT } from "./ai-config.js";
import { catalog, sanitizeRecommend, sanitizeAssist } from "./recommend.js";

let endpoint = AI_ENDPOINT;
export let aiEnabled = Boolean(endpoint);
// 테스트에서 가짜 서버 주소로 바꿀 때만 쓴다
export function _setEndpointForTest(url) { endpoint = url; aiEnabled = Boolean(url); }

async function post(path, body, token, timeoutMs) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint.replace(/\/$/, "") + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), { status: res.status });
    return data;
  } finally { clearTimeout(timer); }
}

// 독자용: 문장을 읽고 블로그 글 중 맞는 글을 고른다. 실패하면 null → 규칙 방식으로 대신
export async function aiRecommend(text, posts) {
  if (!aiEnabled) return null;
  try { return sanitizeRecommend(await post("/recommend", { text, posts: catalog(posts) }, null, 20000), posts); }
  catch (err) { console.warn("AI 추천 실패, 규칙 방식으로 대신합니다", err); return null; }
}

// 운영자용: 책 제목·메모로 글 제목, 요약, 감정, 태그, 설명, 카드뉴스 문구, 본문 정리를 만든다
export async function aiAssist(draft, token) {
  if (!aiEnabled) throw new Error("AI 미연결");
  return sanitizeAssist(await post("/assist", draft, token, 60000));
}
