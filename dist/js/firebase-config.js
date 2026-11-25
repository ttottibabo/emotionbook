// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에서 복사한 값.
// apiKey가 비어 있으면 저장을 건너뛰고 기본 글과 규칙 추천만 동작한다.
// 웹용 apiKey는 공개되어도 되는 값이다. 데이터 보호는 firestore.rules가 맡는다.
export const firebaseConfig = {
  apiKey: "AIzaSyDMgACSwTpHQjJpZ_Gh0EdCJwfNrwxc0qg",
  authDomain: "emotionbook-fcf08.firebaseapp.com",
  projectId: "emotionbook-fcf08",
  storageBucket: "emotionbook-fcf08.firebasestorage.app",
  messagingSenderId: "12148174754",
  appId: "1:12148174754:web:99cfde819d7bdba00bccfb"
};
