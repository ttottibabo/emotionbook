# 감정책 AI 중계 서버 (Cloudflare Worker)

블로그(GitHub Pages)는 코드가 모두 공개되므로 Claude API 키를 넣을 수 없습니다. 이 Worker가 키를 숨겨 두고 블로그 대신 Claude를 부릅니다.

```
독자/관리자 브라우저 → Worker (키 보관, 요청 검사) → Claude API
```

| 주소 | 누가 | 하는 일 |
|---|---|---|
| `POST /recommend` | 독자 (로그인 없음) | 한 문장 → 감정 + 블로그 글 최대 3개와 추천 이유 |
| `POST /assist` | 관리자 (Firebase 로그인) | 책 제목·메모 → 제목, 요약, 감정, 태그, 검색 설명, 본문 정리, 카드뉴스 문구 |

## 지키는 것
- 키는 Cloudflare **Secret**에만 둡니다. 코드와 GitHub에는 없습니다.
- `ALLOWED_ORIGINS`에 적힌 사이트에서 온 요청만 받습니다.
- 독자용 요청은 IP당 1분에 10번으로 제한합니다 (크레딧 보호).
- 관리자용 요청은 Firebase 로그인 토큰으로 Firestore `admins/{uid}` 문서를 읽어 관리자인지 확인합니다.
- 위기 표현은 Claude를 부르기 전에 규칙으로 먼저 걸러 109 안내로 보냅니다.
- 독자 문장과 관리자 메모를 저장하거나 기록하지 않습니다.
- Claude는 정해진 JSON 형식으로만 답하고, 목록에 없는 글 id는 버립니다.

## 배포하기 (내 PC에 Node 없이, 브라우저로만)
1. https://dash.cloudflare.com 에 가입합니다. 무료 요금제이고 카드 등록이 필요 없습니다.
2. **Workers & Pages → Create → Import a repository**에서 GitHub의 `emotionbook` 저장소를 연결합니다.
3. 빌드 설정:
   - **Root directory:** `worker`
   - **Deploy command:** `npx wrangler deploy`
4. 배포가 끝나면 **Settings → Variables and Secrets**에서 다음을 설정합니다.
   - `ANTHROPIC_API_KEY`: **Secret** 종류로, 받은 Claude API 키를 붙여 넣습니다.
   - `FIREBASE_PROJECT_ID`: Firebase 프로젝트 ID (관리자 AI 도우미에 필요합니다).
5. 화면에 보이는 Worker 주소(예: `https://emotionbook-ai.<내아이디>.workers.dev`)를 블로그의 `js/ai-config.js` → `AI_ENDPOINT`에 넣고 푸시합니다.

> `wrangler.toml`의 `FIREBASE_PROJECT_ID`에 값을 직접 써 넣고 푸시해도 됩니다. 프로젝트 ID는 비밀이 아닙니다. API 키는 절대 파일에 쓰지 마세요.

## 확인하기
- 블로그 첫 화면 문구가 "AI(Claude)가 마음을 읽고"로 바뀌면 연결된 것입니다.
- "팀장한테 깨졌어"처럼 감정 단어가 없는 문장을 넣어 추천이 나오는지 봅니다. 규칙 방식은 이 문장을 못 알아봅니다.
- 관리자 화면 → 글쓰기에서 **AI로 나머지 채우기**를 눌러 봅니다.

## 모델과 비용
- 기본 모델은 `claude-opus-5-5`입니다. 무료 크레딧을 아끼려면 `wrangler.toml`의 `MODEL`을 `claude-haiku-5-5`로 바꿉니다.
- 독자용 추천은 생각 깊이(effort)를 `low`로, 관리자 도우미는 `medium`으로 둡니다.
- AI 호출이 실패하면 블로그는 자동으로 규칙 방식으로 대신합니다.
