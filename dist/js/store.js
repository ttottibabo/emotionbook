// Firestore 연결: 익명 사용 기록, 피드백, 블로그 글.
// 개인정보 원칙: 독자가 입력한 문장은 절대 저장하지 않는다. 감정 이름, 사전 단어, 경로, 글 id만 남긴다 (D-003).
import { firebaseConfig } from "./firebase-config.js";
import { SEED_POSTS } from "./posts.js";

export const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
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

// type: recommend | miss | crisis | share | view
// source: input | chip | link | list,  method: rule | ai,  post: 글 id
export const logEvent = (type, { emotion = null, word = null, source = null, method = null, post = null } = {}) =>
  add("events", { type, emotion, word, source, method, post });

export const sendFeedback = (emotion, vote, method = null) => add("feedback", { emotion, vote, method });

/* ---------- 블로그 글 ---------- */
const toPost = d => {
  const x = d.data();
  const created = x.createdAt?.toMillis ? x.createdAt.toMillis() : Date.now();
  return {
    id: d.id, ...x,
    books: x.bookTitle ? [[x.bookTitle, x.bookAuthor || "", x.summary || ""]] : [],
    date: new Date(created).toISOString().slice(0, 10),
    createdMs: created,
    seed: false
  };
};

// 독자 화면: 기본 글 + 발행된 글
export async function loadPublished() {
  const h = await firebase();
  if (!h) return SEED_POSTS;
  try {
    const snap = await h.fs.getDocs(h.fs.query(h.fs.collection(h.db, "posts"), h.fs.where("status", "==", "published")));
    return [...snap.docs.map(toPost).sort((a, b) => b.createdMs - a.createdMs), ...SEED_POSTS];
  } catch (err) { console.warn("글 목록을 읽지 못했습니다", err); return SEED_POSTS; }
}

// 운영자 화면: 초안 포함 모든 글
export async function loadAllPosts(h) {
  const snap = await h.fs.getDocs(h.fs.collection(h.db, "posts"));
  return snap.docs.map(toPost).sort((a, b) => b.createdMs - a.createdMs);
}

const POST_FIELDS = ["title", "summary", "emotion", "tags", "description", "card", "body", "bookTitle", "bookAuthor", "status", "aiUsed", "editSeconds"];
export async function savePost(h, id, data) {
  const clean = Object.fromEntries(POST_FIELDS.map(k => [k, data[k]]));
  const now = h.fs.serverTimestamp();
  if (id) { await h.fs.updateDoc(h.fs.doc(h.db, "posts", id), { ...clean, updatedAt: now }); return id; }
  const ref = await h.fs.addDoc(h.fs.collection(h.db, "posts"), { ...clean, createdAt: now, updatedAt: now });
  return ref.id;
}
export const deletePost = (h, id) => h.fs.deleteDoc(h.fs.doc(h.db, "posts", id));
