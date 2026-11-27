import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { Buffer } from "node:buffer";
import { createSession } from "./session.mjs";

const root = fileURLToPath(new URL("../client", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
async function body(req) {
  const parts = [];
  let size = 0;
  for await (const bytes of req) {
    size += bytes.length;
    if (size > 8192) throw new Error("body size");
    parts.push(bytes);
  }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export function createGameServer() {
  const sessions = new Map();
  return http.createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      if (path.startsWith("/api/")) {
        if (req.method === "POST" && !req.headers["content-type"]?.startsWith("application/json")) {
          return sendJSON(res, 415, { error: "JSON_REQUIRED" });
        }
        const token = /(?:^|;\s*)muyeon=([\w-]+)/u.exec(req.headers.cookie ?? "")?.[1];
        let session = sessions.get(token);
        if (path === "/api/session" && ["GET", "POST"].includes(req.method)) {
          if (!session || req.method === "POST") {
            const next = randomUUID();
            if (session) sessions.delete(token);
            session = createSession();
            sessions.set(next, session);
            res.setHeader("Set-Cookie", "muyeon=" + next + "; Path=/; HttpOnly; SameSite=Lax");
          }
          return sendJSON(res, 200, session.snapshot());
        }
        if (path === "/api/actions" && req.method === "POST") {
          if (!session)
            return sendJSON(res, 409, {
              result: {
                status: "rejected",
                error: { code: "SESSION_MISMATCH", message: "세션을 다시 불러오세요." },
              },
            });
          let request;
          try {
            request = await body(req);
          } catch {
            return sendJSON(res, 400, {
              result: {
                status: "rejected",
                error: { code: "INVALID_REQUEST", message: "유효한 JSON 요청이 필요합니다." },
              },
            });
          }
          if (sessions.get(token) !== session)
            return sendJSON(res, 409, {
              result: {
                status: "rejected",
                error: {
                  code: "SESSION_MISMATCH",
                  message: "세션이 바뀌었습니다. 다시 연결해 주세요.",
                },
              },
            });
          const result = session.act(request);
          const code =
            result.status === "accepted"
              ? 200
              : ({
                  REQUEST_CONFLICT: 409,
                  SESSION_MISMATCH: 409,
                  INVALID_REQUEST: 400,
                  RESPONSE_UNAVAILABLE: 503,
                }[result.error.code] ?? 403);
          return sendJSON(res, code, { result, state: session.snapshot() });
        }
        return sendJSON(res, 404, { error: "NOT_FOUND" });
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405).end();
        return;
      }
      const route = path.replace(/^\/game\/client(?=\/|$)/u, "") || "/";
      const file = resolve(root, "." + (route === "/" ? "/index.html" : decodeURIComponent(route)));
      const type = mime[extname(file)];
      if (
        !type ||
        !file.startsWith(root + sep) ||
        dirname(file).startsWith(resolve(root, "tests"))
      ) {
        res.writeHead(404).end();
        return;
      }
      const asset = await readFile(file);
      res.writeHead(200, { "Content-Type": type, "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : asset);
    } catch (error) {
      res.writeHead(error.code === "ENOENT" ? 404 : 400).end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  createGameServer().listen(port, process.env.HOST ?? "127.0.0.1", () => {
    process.stdout.write("무연리 조사 서버 실행 중 (포트 " + port + ")\n");
  });
}
