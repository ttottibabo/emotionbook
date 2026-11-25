// POST /api/assist — 관리자용 AI 발행 도우미
import { handle } from "../lib/core.js";
export default function handler(req, res) { return handle("assist", req, res); }
