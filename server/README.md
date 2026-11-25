# 감정책 AI 중계 서버 (Vercel Functions)

블로그(GitHub Pages)는 코드가 모두 공개되므로 Claude API 키를 넣을 수 없습니다. 이 서버가 키를 숨겨 두고 블로그 대신 Claude를 부릅니다.

```
독자/관리자 브라우저 → Vercel 서버 (키 보관, 요청 검사) → Claude API
```

| 주소 | 누가 | 하는 일 |
|---|---|---|
| `POST /api/recommend` | 독자 (로그인 없음) | 한 문장 → 감정 + 블로그 글 최대 3개와 추천 이유 |
| `POST /api/assist` | 관리자 (Firebase 로그인) | 책 제목·메모 → 제목, 요약, 감정, 태그, 검색 설명, 본문 정리, 카드뉴스 문구 |

| 파일 | 역할 |
|---|---|
| `api/recommend.js`, `api/assist.js` | Vercel이 주소로 만들어 주는 함수 (진입점) |
| `lib/core.js` | 공통 로직: 사이트 확인, 위기 검사, 요청 제한, 관리자 확인, Claude 호출 |
| `vercel.json` | 함수 최대 실행 시간 60초 |
| 테스트 | `../tests/server.html` (Claude는 가짜로 대신해 V1~V13 확인) |

## 지키는 것
- 키는 Vercel 환경 변수 **`ANTHROPIC_API_KEY` (Sensitive)**에만 둡니다. 코드와 GitHub에는 없습니다.
- 블로그 주소(`https://ttottibabo.github.io`)에서 온 요청만 받습니다.
- 독자용 요청은 IP당 1분에 10번으로 제한합니다 (크레딧 보호, 서버 인스턴스마다 셈).
- 관리자용 요청은 Firebase 로그인 토큰으로 Firestore `admins/{uid}` 문서를 읽어 관리자인지 확인합니다.
- 위기 표현은 Claude를 부르기 전에 규칙으로 먼저 걸러 109 안내로 보냅니다.
- 독자 문장과 관리자 메모를 저장하거나 기록하지 않습니다.

## 배포하기 (GitHub 계정으로 로그인, 새 가입 없음)
1. https://vercel.com/signup 에서 **Continue with GitHub**를 누릅니다. 요금제를 물으면 **Hobby (무료)**를 고릅니다.
2. **Add New… → Project**에서 `ttottibabo/emotionbook` 저장소의 **Import**를 누릅니다. 저장소가 안 보이면 *Adjust GitHub App Permissions*에서 이 저장소를 허용합니다.
3. 설정 화면:
   - **Root Directory:** **Edit**를 눌러 `server`를 고릅니다 ← 중요
   - **Framework Preset:** `Other`
   - **Environment Variables**에 하나 추가합니다.
     - Key: `ANTHROPIC_API_KEY`
     - Value: 받은 Claude API 키
     - 가능하면 **Sensitive**를 켭니다.
4. **Deploy**를 누르고 1~2분 기다립니다.
5. 배포된 주소(예: `https://emotionbook-xxxx.vercel.app`)를 확인합니다. 블로그의 `js/ai-config.js`에는 **뒤에 `/api`를 붙여** 넣습니다.
   - 예: `https://emotionbook-xxxx.vercel.app/api`

> 주소로 그냥 들어가면 404가 보이는 게 정상입니다. 이 서버는 화면 없이 `/api/...` 요청만 받습니다.

## 설정 바꾸기 (Vercel → Project → Settings → Environment Variables)
| 이름 | 기본값 | 바꿀 때 |
|---|---|---|
| `MODEL` | `claude-opus-5-5` | 무료 크레딧을 아끼려면 `claude-haiku-5-5` |
| `ALLOWED_ORIGINS` | `https://ttottibabo.github.io` + 로컬 주소 | 블로그 주소가 바뀌었을 때 |
| `FIREBASE_PROJECT_ID` | `emotionbook-fcf08` | Firebase 프로젝트가 바뀌었을 때 |

환경 변수를 바꾼 뒤에는 **Deployments → 최신 배포 → Redeploy**를 눌러야 반영됩니다. 키를 새로 받았을 때도 `ANTHROPIC_API_KEY` 값만 바꾸고 Redeploy하면 됩니다.

## 확인하기
- 블로그 첫 화면 문구가 "AI(Claude)가 마음을 읽고"로 바뀌면 연결된 것입니다.
- "팀장한테 깨졌어"를 넣어 추천이 나오는지 봅니다. 규칙 방식은 이 문장을 못 알아봅니다.
- 관리자 화면 → 글쓰기에서 **AI로 나머지 채우기**를 눌러 봅니다.
- 오류가 나면 Vercel → Project → **Logs**에서 원인을 봅니다.
