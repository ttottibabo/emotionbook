// 감정 인식과 글 고르기 (순수 함수: 화면·네트워크에 의존하지 않아 테스트하기 쉽다)
import { DICT, CRISIS } from "./data.js";

export const EMOTIONS = DICT.map(d => d.key);

// 규칙 방식: 위기 표현 → 감정 단어 순서로 찾는다. 위기 검사는 항상 먼저 (D-001).
export function ruleMatch(input) {
  const compact = String(input || "").replace(/\s+/g, "");
  if (!compact) return { compact, empty: true };
  if (CRISIS.some(w => compact.includes(w))) return { compact, crisis: true };
  for (const d of DICT) {
    const word = d.words.find(x => compact.includes(x));
    if (word) return { compact, hit: d, word };
  }
  return { compact, hit: null };
}

export function byEmotion(key) { return DICT.find(d => d.key === key) || null; }

// 감정에 맞는 글: 새 글(운영자가 쓴 글)이 기본 글보다 먼저, 최대 n개
export function postsFor(emotion, posts, n = 3) {
  return posts.filter(p => p.emotion === emotion)
    .sort((a, b) => (a.seed === b.seed ? String(b.date).localeCompare(String(a.date)) : a.seed ? 1 : -1))
    .slice(0, n);
}

// AI에 보낼 글 목록: 공개된 글의 id·제목·감정·요약만 보낸다
export const catalog = posts => posts.slice(0, 60).map(p => ({ id: p.id, title: p.title, emotion: p.emotion, summary: String(p.summary || "").slice(0, 120) }));

// AI 추천 결과 검증: 형식이 틀리거나 없는 글을 고르면 버린다 → null이면 규칙 방식으로 대신한다
export function sanitizeRecommend(r, posts) {
  if (!r || typeof r !== "object") return null;
  if (r.crisis === true) return { crisis: true };
  if (!EMOTIONS.includes(r.emotion)) return null;
  const ids = new Set(posts.map(p => p.id));
  const seen = new Set();
  const picks = (Array.isArray(r.picks) ? r.picks : [])
    .filter(x => x && ids.has(x.id) && !seen.has(x.id) && seen.add(x.id))
    .slice(0, 3)
    .map(x => ({ id: x.id, why: String(x.why || "").slice(0, 200) }));
  return { emotion: r.emotion, picks, message: String(r.message || "").slice(0, 300) };
}

// 운영자 글쓰기 도우미 결과 검증 (AI·규칙 공통)
export function sanitizeAssist(r) {
  if (!r || typeof r !== "object") return null;
  const s = (v, n) => String(v ?? "").trim().slice(0, n);
  const tags = (Array.isArray(r.tags) ? r.tags : []).map(t => s(t, 20).replace(/^#/, "")).filter(Boolean).slice(0, 6);
  return {
    title: s(r.title, 60),
    summary: s(r.summary, 120),
    emotion: EMOTIONS.includes(r.emotion) ? r.emotion : "",
    tags,
    description: s(r.description, 90),
    card: s(r.card, 400),
    body: s(r.body, 6000)
  };
}

// AI가 연결되지 않았을 때 쓰는 규칙 버전 글쓰기 도우미
export function localAssist({ bookTitle = "", bookAuthor = "", notes = "" }) {
  const text = String(notes).trim();
  const r = ruleMatch(text);
  const emotion = r.hit ? r.hit.key : "";
  const first = (text.split(/(?<=[.!?。])\s+|\n/).find(x => x.trim()) || "").trim();
  const book = bookTitle ? `『${bookTitle}』` : "이 책";
  return sanitizeAssist({
    title: emotion ? `${emotion}의 마음으로 읽은 ${book}` : `${book}을 읽고`,
    summary: first || `${book}을 읽고 남긴 기록입니다.`,
    emotion,
    tags: [emotion, bookTitle, bookAuthor, "책추천"].filter(Boolean),
    description: (first || `${book} 리뷰`).slice(0, 80),
    card: `${book}${bookAuthor ? ` · ${bookAuthor}` : ""}\n${first}\n\n#감정책 #책추천${emotion ? " #" + emotion : ""}`,
    body: text
  });
}
