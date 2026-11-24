// 익명 사용 기록과 피드백 저장 (Firestore).
// 개인정보 원칙: 사용자가 입력한 문장은 절대 저장하지 않는다. 감정 이름, 사전 단어, 경로만 남긴다.
import { firebaseConfig } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
export const enabled = Boolean(firebaseConfig && firebaseConfig.apiKey);

let handle = null;
export function firebase() {
  if (!enabled) return Promise.resolve(null);
  if (!handle) {
    handle = (async () => {
      const appMod = await import(SDK + "firebase-app.js");
      const fs = await import(SDK + "firebase-firestore.js");
      const app = appMod.initializeApp(firebaseConfig);
      return { app, fs, db: fs.getFirestore(app) };
    })().catch(err => { console.warn("Firebase 연결 실패", err); return null; });
  }
  return handle;
}

// 같은 방문 안에서만 유지되는 무작위 번호 (사람을 특정하지 않음)
function sessionId() {
  try {
    let id = sessionStorage.getItem("eb_sid");
    if (!id) { id = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("eb_sid", id); }
    return id;
  } catch { return "nosession"; }
}

async function add(collection, data) {
  const h = await firebase();
  if (!h) { console.debug("[기록 생략]", collection, data); return false; }
  try {
    await h.fs.addDoc(h.fs.collection(h.db, collection), { ...data, sid: sessionId(), ts: h.fs.serverTimestamp() });
    return true;
  } catch (err) { console.warn("기록 실패", err); return false; }
}

// type: recommend | miss | crisis | share,  source: input | chip | link
export const logEvent = (type, { emotion = null, word = null, source = null } = {}) =>
  add("events", { type, emotion, word, source });

export const sendFeedback = (emotion, vote) => add("feedback", { emotion, vote });
