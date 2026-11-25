// POST /api/recommend — 독자용 AI 글 찾기
import { handle } from "../lib/core.js";
export default function handler(req, res) { return handle("recommend", req, res); }
