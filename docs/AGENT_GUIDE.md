# AGENT GUIDE

이 저장소에서 작업하는 AI 에이전트(Claude Code 등)와 새로 합류한 사람을 위한 규칙입니다.

## 프로젝트 한 줄 요약
요즘 기분을 한 문장으로 적으면 규칙 기반으로 감정을 읽고 책 3권을 추천하는 웹 서비스입니다. 빌드 도구 없는 HTML·CSS·JS 모듈과 Firebase(Firestore, Auth)로 만들었습니다.

## 파일 지도
| 경로 | 역할 | 고칠 때 주의 |
|---|---|---|
| `index.html`, `js/app.js` | 사용자 화면 | 문장 원문을 저장·전송하는 코드를 넣지 말 것 |
| `js/data.js` | 감정 사전, 책 목록, 위기 표현 | 책을 바꾸면 DECISION_LOG에 이유 기록 |
| `js/recommend.js` | 감정 인식 (순수 함수) | 바꾸면 `tests/run.html` 실행 |
| `js/store.js` | Firestore 기록 | 필드를 바꾸면 `firestore.rules`도 같이 수정 |
| `admin.html`, `js/admin.js` | 운영자 화면 | `?demo=1`은 예시 데이터임을 표시할 것 |
| `firestore.rules` | 데이터 접근 규칙 | 읽기 권한은 운영자만 |
| `prototype.html` | v4 프로토타입 기록 | 수정하지 않음 |
| `dist/` | 배포 패키지 | 직접 고치지 말고 `build.ps1`로 다시 만들 것 |
| `tests/` | 로직·화면 테스트 | |
| `docs/` | 기획·기록 문서 | |

## 절대 규칙
1. **위기 표현 검사는 항상 추천보다 먼저 실행합니다.** 순서를 바꾸거나 AI 판단으로 대체하지 않습니다 (D-001).
2. **사용자가 입력한 문장은 저장하지도, 외부로 보내지도 않습니다** (D-003). URL에도 넣지 않습니다 (D-007).
3. 109 안내 문구를 지우거나 약하게 바꾸지 않습니다.
4. 화면에 사용자 입력을 넣을 때는 `esc()`로 이스케이프합니다.
5. API 키, 비밀번호, 개인 계정 정보를 커밋하지 않습니다. 웹용 Firebase 설정값은 공개되어도 괜찮지만, 서비스 계정 키(JSON)는 절대 올리지 않습니다.

## 작업 순서
1. 작업 전에 `docs/WORKLOG.md`의 "다음 할 일"을 확인합니다.
2. 코드를 고칩니다.
3. `tests/run.html`, `tests/ui.html`을 실행해 실패가 0인지 확인합니다.
4. `build.ps1`로 `dist/`를 다시 만듭니다.
5. 화면이 바뀌었으면 `docs/screenshots/`를 갱신합니다.
6. **문서를 같이 갱신합니다.**
   - `WORKLOG.md`: 오늘 한 일, 다음 할 일
   - `DECISION_LOG.md`: 선택지가 둘 이상이었던 결정
   - `SUCCESS_FAILURE_LOG.md`: 시도한 것과 결과 (실패 포함)
   - `TEST_REPORT.md`: 테스트 수나 결과가 바뀌었을 때
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
events/{자동ID}   { type: recommend|miss|crisis|share, emotion, word, source: input|chip|link, sid, ts }
feedback/{자동ID} { emotion, vote: up|down, sid, ts }
admins/{uid}      { }   ← 콘솔에서만 추가
```
