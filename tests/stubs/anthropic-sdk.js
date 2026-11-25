// 테스트용 가짜 Anthropic SDK: 서버 코드(server/lib/core.js)를 브라우저에서 시험할 때만 쓴다
class APIError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
class RateLimitError extends APIError {}
class AuthenticationError extends APIError {}
export default class Anthropic {
  static APIError = APIError;
  static RateLimitError = RateLimitError;
  static AuthenticationError = AuthenticationError;
}
