// Claude AI 중계 서버(Cloudflare Worker) 주소. worker/README.md 순서대로 배포한 뒤 주소를 넣는다.
// 예: "https://emotionbook-ai.내아이디.workers.dev"
// 비어 있으면 AI 없이 규칙 방식으로만 동작한다.
// Claude API 키는 여기에 절대 넣지 않는다. 키는 Worker의 비밀 변수(ANTHROPIC_API_KEY)에만 둔다.
export const AI_ENDPOINT = "";
