# 감정책 · 기분으로 찾는 책 블로그

**책 제목과 메모만 쓰면, 발행 준비는 AI가.**
**오늘 기분, 한 문장이면 맞는 책 이야기.**

감정 기반 책 블로그에 Claude AI 기능 두 가지를 넣어, 블로그 운영자(나)의 발행 과정과 독자의 글 찾기를 자동화한 프로젝트입니다.

## 📌 제출물 바로가기
| 항목 | 링크 |
|---|---|
| 배포된 블로그 | https://ttottibabo.github.io/emotionbook/ |
| PRD 기획서 (2쪽) | [docs/PRD.md](docs/PRD.md) |
| 테스트 보고서 (2쪽) | [docs/TEST_REPORT.md](docs/TEST_REPORT.md) |
| **결과보고서 (PDF, 2쪽)** | [docs/RESULT_REPORT.pdf](docs/RESULT_REPORT.pdf) · 원본 [docs/report/result_report.html](docs/report/result_report.html) |
| 에이전트용 지침 | [docs/AGENT_GUIDE.md](docs/AGENT_GUIDE.md) |
| 성공·실패 로그 / 의사결정 로그 | [docs/SUCCESS_FAILURE_LOG.md](docs/SUCCESS_FAILURE_LOG.md) · [docs/DECISION_LOG.md](docs/DECISION_LOG.md) |
| 작업 일지 / 커밋 기록 | [docs/WORKLOG.md](docs/WORKLOG.md) · [커밋 목록](https://github.com/ttottibabo/emotionbook/commits/main) |
| 소스코드 | 방문자 `index.html` · 관리자 `admin.html` · `js/` · AI 중계 서버 `server/` · `firestore.rules` |

- 👉 **방문자 페이지:** https://ttottibabo.github.io/emotionbook/
- 🔧 **관리자 페이지:** https://ttottibabo.github.io/emotionbook/admin.html · [예시 데이터로 둘러보기](https://ttottibabo.github.io/emotionbook/admin.html?demo=1)

| 블로그 첫 화면 | 관리자 글쓰기 (AI 발행 도우미) | 관리자 지표 |
|---|---|---|
| ![블로그](docs/screenshots/01_blog_home.png) | ![글쓰기](docs/screenshots/05_admin_write_ai.png) | ![지표](docs/screenshots/06_admin_stats_demo.png) |

## AI로 자동화한 워크플로우

### 1. 관리자(나): AI 발행 도우미
| 전 (직접) | 후 (AI 발행 도우미) |
|---|---|
| 메모 → 제목 짓기 → 요약 → 감정 분류 → 태그 → 검색 설명 → 인스타 문구를 하나씩 따로 작성 | **책 제목 + 메모** → [✨ AI로 나머지 채우기] → 확인·수정 → 발행 → 카드 문구 복사 |

- Claude가 제목, 한 줄 요약, 감정, 태그, 검색 설명(80자), 본문 정리, 인스타 카드 문구를 한 번에 만듭니다.
- 메모에 없는 내용은 지어내지 않도록 했고, **사람이 확인한 뒤에만 발행**합니다.
- 글마다 작성 시간과 AI 사용 여부를 저장해 **자동화로 줄어든 시간**을 지표 탭에서 봅니다.

### 2. 독자: AI 글 찾기
- 기분을 한 문장으로 적으면 Claude가 문장 전체를 읽고 **블로그 글 중에서** 맞는 글을 골라 이유와 함께 보여 줍니다.
- "팀장한테 깨졌어"처럼 감정 단어가 없는 문장도 읽습니다. 규칙 방식은 이런 문장을 읽지 못했습니다.
- AI가 실패하면 자동으로 규칙 방식(감정 단어 사전)으로 이어갑니다.

### 안전과 개인정보
- 자해·자살 표현은 **AI보다 먼저** 규칙으로 걸러 자살예방 상담전화 **109**를 안내합니다.
- 독자 문장은 감정을 읽기 위해 Claude에 보내지만 **저장하지 않습니다.**
- Claude API 키는 블로그 코드에 없습니다. **Vercel 중계 서버의 비밀 환경 변수**에만 있습니다.

```
방문자·관리자 브라우저 ──▶ Vercel 중계 서버 (키 보관, 관리자 확인, 요청 제한) ──▶ Claude API
        │
        └──▶ Firebase (글 저장, 로그인, 익명 지표)
```

## 프로젝트 진행 과정
| 단계 | 결과물 |
|---|---|
| 1. 프로토타입 | [`prototype.html`](prototype.html): 규칙 방식과 AI 방식을 같은 문장으로 비교 (v4) |
| 2. 기획 | [`docs/PRD.md`](docs/PRD.md): 문제, 페르소나, AS-IS/TO-BE, 지표, 출시·운영 계획 |
| 3. 디자인 | 방문자 1단 구성, 관리자 탭 3개, 글쓰기 "내가 쓰는 부분 / AI가 채우는 부분" 2단 구성 |
| 4. 구현 | `index.html`, `admin.html`, `styles.css`, `js/`, `server/`, `firestore.rules` |
| 5. 테스트 | [`docs/TEST_REPORT.md`](docs/TEST_REPORT.md): 로직 55개, 화면 20개 통과 |
| 6. 배포 | GitHub Pages (블로그), Vercel Functions (AI), `dist/` (Firebase Hosting용) |
| 기록 | [의사결정](docs/DECISION_LOG.md) · [성공/실패](docs/SUCCESS_FAILURE_LOG.md) · [작업 일지](docs/WORKLOG.md) · [에이전트 가이드](docs/AGENT_GUIDE.md) |

## 폴더 구조
```
emotionbook/
├─ index.html          방문자 페이지 (글 찾기, 글 목록, 글 보기)
├─ admin.html          관리자 페이지 (글쓰기·AI 도우미, 글 목록, 지표 / ?demo=1 예시)
├─ prototype.html      프로토타입 v4 (보존)
├─ styles.css          공통 스타일
├─ js/
│  ├─ app.js           방문자 화면
│  ├─ admin.js         관리자 화면, 지표 집계
│  ├─ ai.js            AI 중계 서버 호출
│  ├─ ai-config.js     중계 서버 주소 (비어 있으면 규칙 방식)
│  ├─ recommend.js     감정 인식, 글 고르기, AI 답 검증 (순수 함수)
│  ├─ store.js         Firestore: 글, 익명 기록, 피드백
│  ├─ posts.js         기본 글 12편
│  ├─ data.js          감정 사전, 책 36권, 위기 표현
│  ├─ util.js          이스케이프, 조사, 날짜
│  └─ firebase-config.js  Firebase 설정 (비어 있으면 저장 생략)
├─ server/             Claude 중계 서버 (Vercel Functions) + 배포 안내
├─ firestore.rules     데이터 접근 규칙
├─ firebase.json       Firebase 배포 설정
├─ build.ps1           dist/ 만들기
├─ dist/               배포 패키지
├─ tests/              로직·화면 테스트
└─ docs/               기획·기록 문서, 스크린샷
```

## 켜는 순서
아무것도 연결하지 않아도 블로그(기본 글 12편)와 규칙 방식 추천은 동작합니다.

1. **Firebase (글 저장, 관리자 로그인, 지표)**
   1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만들고 웹 앱을 추가합니다.
   2. 설정값을 `js/firebase-config.js`에 붙여 넣습니다.
   3. Firestore Database를 만들고 `firestore.rules` 내용을 규칙 탭에 게시합니다.
   4. Authentication에서 이메일/비밀번호를 켜고 관리자 계정을 만듭니다.
   5. Firestore에 `admins` 컬렉션을 만들고 문서 ID를 관리자 UID로 추가합니다.
2. **Claude AI:** [`server/README.md`](server/README.md) 순서대로 Vercel에 배포하고, 주소(끝에 `/api`)를 `js/ai-config.js`에 넣습니다.

## 실행과 테스트
- **보기:** 서비스 주소를 열거나 로컬 서버(VS Code Live Server 등)로 `index.html`을 엽니다.
- **배포 패키지:** `powershell -ExecutionPolicy Bypass -File build.ps1`
- **테스트:** `tests/run.html`, `tests/ui.html`을 브라우저로 엽니다.

## 기술
HTML · CSS · JavaScript (ES 모듈, 빌드 도구 없음) · Claude API (`claude-opus-5-5`, structured outputs) · Vercel Functions · Firebase Firestore · Firebase Authentication · GitHub Pages
