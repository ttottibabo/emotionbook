// Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹)에서 복사한 값을 넣는다.
// apiKey가 비어 있으면 기록·피드백 저장을 건너뛰고 추천 기능만 동작한다.
// 웹용 apiKey는 공개되어도 되는 값이다. 데이터 보호는 firestore.rules가 맡는다.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
