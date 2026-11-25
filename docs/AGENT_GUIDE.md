# AGENT GUIDE

이 저장소에서 작업하는 AI 에이전트(Claude Code 등)와 새로 합류한 사람을 위한 규칙입니다.

## 프로젝트 한 줄 요약
감정 기반 책 블로그입니다. 관리자는 Claude 발행 도우미로 글을 쓰고, 독자는 기분 한 문장으로 Claude가 골라 주는 글을 읽습니다. 빌드 도구 없는 HTML·CSS·JS 모듈, Firebase(Firestore, Auth), Cloudflare Worker(Claude 중계)로 만들었습니다.

## 파일 지도
| 경로 | 역할 | 고칠 때 주의 |
|---|---|---|
| `index.html`, `js/app.js` | 방문자 화면 | 독자 문장을 저장하거나 URL·기록에 넣지 말 것 |
| `admin.html`, `js/admin.js` | 관리자 화면, 지표 집계 | `?demo=1`은 예시 데이터임을 표시할 것 |
| `js/ai.js`, `js/ai-config.js` | AI 중계 서버 호출 | **Claude API 키를 넣지 말 것** (주소만) |
| `js/recommend.js` | 감정 인식, 글 고르기, AI 답 검증 (순수 함수) | 바꾸면 `tests/run.html` 실행 |
| `js/store.js` | Firestore 글·기록 | 필드를 바꾸면 `firestore.rules`도 같이 수정 |
| `js/posts.js`, `js/data.js` | 기본 글, 감정 사전, 책 목록, 위기 표현 | 책을 바꾸면 DECISION_LOG에 이유 기록. 위기 표현은 `worker/src/index.js`와 같게 |
| `worker/` | Claude 중계 서버 | 프롬프트·스키마를 바꾸면 `js/recommend.js`의 검증 함수도 확인 |
| `firestore.rules` | 데이터 접근 규칙 | 글 쓰기와 기록 읽기는 관리자만 |
| `prototype.html` | v4 프로토타입 기록 | 수정하지 않음 |
| `dist/` | 배포 패키지 | 직접 고치지 말고 `build.ps1`로 다시 만들 것 |

## 절대 규칙
1. **위기 표현 검사는 항상 AI보다, 추천보다 먼저 실행합니다.** 브라우저와 Worker 양쪽에서 합니다 (D-001).
2. **독자가 입력한 문장은 저장하지 않습니다.** 감정을 읽기 위해 Claude에 보내는 것만 허용합니다 (D-009). URL에도 넣지 않습니다 (D-007).
3. 109 안내 문구를 지우거나 약하게 바꾸지 않습니다.
4. 화면에 사용자 입력과 **AI 답**을 넣을 때는 `esc()`로 이스케이프합니다.
5. **Claude API 키는 Cloudflare Worker Secret에만 둡니다.** 코드, `wrangler.toml`, 커밋, 채팅 어디에도 쓰지 않습니다. 웹용 Firebase 설정값은 공개되어도 괜찮지만 서비스 계정 키(JSON)는 올리지 않습니다.
6. AI 결과를 사람 확인 없이 자동 발행하는 기능을 넣지 않습니다 (D-010).
7. AI가 실패해도 블로그가 동작해야 합니다. 새 AI 기능에는 규칙 대체 경로를 같이 만듭니다 (D-011).

## 작업 순서
1. 작업 전에 `docs/WORKLOG.md`의 "다음 할 일"을 확인합니다.
2. 코드를 고칩니다.
3. `tests/run.html`, `tests/ui.html`을 실행해 실패가 0인지 확인합니다.
4. `build.ps1`로 `dist/`를 다시 만듭니다.
5. 화면이 바뀌었으면 `docs/screenshots/`를 갱신합니다.
6. **문서를 같이 갱신합니다.** WORKLOG(한 일, 다음 할 일), DECISION_LOG(선택지가 둘 이상이었던 결정), SUCCESS_FAILURE_LOG(시도와 결과, 실패 포함), TEST_REPORT(테스트 수나 결과가 바뀌었을 때)
7. 커밋 메시지는 한국어로, 무엇을 왜 바꿨는지 씁니다.

## 자주 쓰는 명령
```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```
```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files tests\run.html
```

## Firestore 데이터 형태
```
posts/{자동ID}    { title, summary, emotion, tags[], description, card, body, bookTitle, bookAuthor,
                    status: draft|published, aiUsed, editSeconds, createdAt, updatedAt }
events/{자동ID}   { type: recommend|miss|crisis|share|view, emotion, word, source: input|chip|link|list,
                    method: rule|ai, post, sid, ts }
feedback/{자동ID} { emotion, vote: up|down, method: rule|ai, sid, ts }
admins/{uid}      { role: "admin" }   ← 콘솔에서만 추가
```

## AI 중계 서버
| 주소 | 입력 | 출력 |
|---|---|---|
| `POST /recommend` | `{ text, posts: [{id, title, emotion, summary}] }` | `{ crisis, emotion, picks: [{id, why}], message }` |
| `POST /assist` (헤더 `Authorization: Bearer <Firebase ID 토큰>`) | `{ bookTitle, bookAuthor, notes }` | `{ title, summary, emotion, tags, description, body, card }` |
