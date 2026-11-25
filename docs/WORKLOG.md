# WORKLOG

날짜별 작업 기록입니다. 최신 날짜가 위에 옵니다.

## 2026-11-25 · v2.0 블로그 + AI 워크플로우 자동화

**목표:** 과제 주제 "내 블로그에 독자 또는 관리자(나)를 위한 AI 기능을 구현해 워크플로우 자동화"에 맞춰 감정책을 블로그로 확장

**한 일**
- 방문자 페이지(`index.html`): 마음으로 글 찾기, 모든 글 + 감정 필터, 글 보기(`?p=`), 공유
- 관리자 페이지(`admin.html`): 글쓰기(AI 발행 도우미) · 글 목록 · 지표 탭
- AI 기능 두 가지
  - 관리자: 책 제목·메모 → 제목, 요약, 감정, 태그, 검색 설명, 본문 정리, 인스타 카드 문구
  - 독자: 문장 → 블로그 글 중 맞는 글과 이유
- Claude 중계 서버 `worker/` (Cloudflare Worker, 키는 Secret에만) (D-008)
- AI 실패 시 규칙 방식으로 이어가기 (D-011), 독자 문장 미저장 + 화면 고지 (D-009)
- 지표 추가: 방식별(AI/규칙) 만족도, 많이 본 글, 글쓰기 자동화(작성 시간 비교)
- `firestore.rules`: `posts` 컬렉션, 기록 필드(method, post) 추가
- 기본 글 12편 (`js/posts.js`)
- 테스트: 로직 55개, 화면 20개 통과 (가짜 AI 서버 포함)
- PRD v2.0 재작성, DECISION_LOG D-008~D-013, TEST_REPORT, 스크린샷 11장

- 제출 양식에 맞춰 PRD·테스트 보고서를 2쪽으로 압축 (v2.1), README 맨 위에 제출물 바로가기
- Firebase 연결 (emotionbook-fcf08), 배포 사이트에서 보안 규칙 6개 시나리오 확인
- 버그 수정: 로그인 전 관리자 탭 노출, Firebase 응답 대기로 첫 화면 지연

**사용한 도구:** Claude Code (기획 정리, 구현, 테스트, 문서), 헤드리스 Chrome (테스트·스크린샷)

**다음 할 일**
- [x] Firebase 프로젝트 만들기 (emotionbook-fcf08) → `js/firebase-config.js` 입력
- [x] Firestore 만들기 → 보안 규칙 게시 → 관리자 계정 + `admins` 등록 (보안 규칙 6개 시나리오 확인)
- [ ] 관리자로 로그인해 첫 글 발행, 로그인·실제 관리자 화면 캡처
- [ ] Cloudflare Worker 배포 (`worker/README.md`) → `ANTHROPIC_API_KEY` Secret, `FIREBASE_PROJECT_ID` 설정 → `js/ai-config.js`에 주소 입력
- [ ] AI 실제 호출 확인 (TEST_REPORT 4장) → K1~K3 결과 기록
- [ ] 리뷰 6편 작성 (AI 3 / 직접 3) → 작성 시간 비교
- [ ] 설문 진행 후 PRD 3.3.2 채우기, 지인 10명 베타

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
- PRD를 PRD 템플릿 양식(12개 장: 개요, 문제(SWOT·3C·RICE), 해결 방안, 가설·지표, 기능·비기능·디자인 요구사항, 출시·운영, 일정, 승인, Q&A)에 맞춰 다시 작성

**사용한 도구:** Claude Code (구현, 테스트, 문서 초안), 헤드리스 Chrome (테스트·스크린샷)

**다음 할 일**
- [ ] Firebase 프로젝트 만들기 → `js/firebase-config.js` 입력 → 보안 규칙 배포
- [ ] Rules Playground로 보안 규칙 검증 (TEST_REPORT 4장)
- [ ] 운영자 계정 만들고 `admins` 컬렉션에 등록
- [ ] 설문 조사 진행 후 PRD 3.3.2 채우기
- [ ] 지인 10명 베타 테스트 → 피드백 정리
- [ ] 인스타 카드뉴스 12장 (감정별) 제작

## 2026-11-11 · 프로토타입 v4

- 같은 문장을 규칙(탭 1)과 AI(탭 2)로 분석해 비교하는 화면 제작
- 위기 표현은 AI 호출 전에 규칙으로 먼저 거르도록 설계 (D-001)
- GitHub Pages에 첫 업로드 → AI 탭은 claude.ai 밖에서 동작하지 않음을 확인 (SUCCESS_FAILURE_LOG #2)
