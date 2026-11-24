# WORKLOG

날짜별 작업 기록입니다. 최신 날짜가 위에 옵니다.

## 2026-11-24 · v1.0 공개판으로 재구성

**목표:** 프로토타입을 실제 출시·운영할 수 있는 구조로 바꾸기

**한 일**
- 프로토타입 v4 `index.html`을 `prototype.html`로 보존
- 공개판은 규칙 방식만 쓰기로 결정 (DECISION_LOG D-002)
- 단일 파일을 나눔: `styles.css`, `js/data.js`, `js/recommend.js`, `js/app.js`, `js/store.js`, `js/admin.js`, `js/firebase-config.js`
- 새 기능: 👍/👎 피드백, 공유 링크(`?emo=`), 감정 직접 선택, 익명 사용 기록
- 운영자 화면 `admin.html`: 로그인, 운영자 확인, 지표(추천 수, 만족도, 감정 못 찾음, 공유, 위기 안내), 예시 데이터 모드
- `firestore.rules`: 추가만 허용, 읽기는 운영자만, 필드 검증
- `build.ps1`로 `dist/` 생성, `firebase.json` 작성
- 테스트: 로직 35개, 화면 10개 통과 (TEST_REPORT)
- 버그 수정: 과거형 감정 단어 누락 (D-006), 한국어 단어 중간 줄바꿈
- 문서 작성: PRD(마케팅·운영 계획 포함), DECISION_LOG, SUCCESS_FAILURE_LOG, TEST_REPORT, AGENT_GUIDE

**사용한 도구:** Claude Code (구현, 테스트, 문서 초안), 헤드리스 Chrome (테스트·스크린샷)

**다음 할 일**
- [ ] Firebase 프로젝트 만들기 → `js/firebase-config.js` 입력 → 보안 규칙 배포
- [ ] Rules Playground로 보안 규칙 검증 (TEST_REPORT 4장)
- [ ] 운영자 계정 만들고 `admins` 컬렉션에 등록
- [ ] 지인 10명 베타 테스트 → 피드백 정리
- [ ] 인스타 카드뉴스 12장 (감정별) 제작

## 2026-11-11 · 프로토타입 v4

- 같은 문장을 규칙(탭 1)과 AI(탭 2)로 분석해 비교하는 화면 제작
- 위기 표현은 AI 호출 전에 규칙으로 먼저 거르도록 설계 (D-001)
- GitHub Pages에 첫 업로드 → AI 탭은 claude.ai 밖에서 동작하지 않음을 확인 (SUCCESS_FAILURE_LOG #2)
