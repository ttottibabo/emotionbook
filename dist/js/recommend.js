// 규칙 기반 추천. 화면(DOM)과 무관한 순수 함수만 둔다 → tests/에서 그대로 테스트한다.
import { DICT, CRISIS } from "./data.js";

export const EMOTIONS = DICT.map(d => d.key);

// 빈칸을 지운 문장에서 ① 위기 표현 ② 감정 단어(사전 순서대로 첫 번째) 순으로 찾는다.
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

export function byEmotion(key) {
  return DICT.find(d => d.key === key) || null;
}
