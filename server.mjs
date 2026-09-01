import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  normalize,
  relative,
  resolve,
} from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import serverEntry from "./dist/server/server.js";

const appRoot = dirname(fileURLToPath(import.meta.url));
const defaultClientDir = resolve(appRoot, "dist/client");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript; charset=utf-8",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

const CONTENT_SECURITY_POLICY_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https:",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
];

function getContentType(filePath) {
  const extension = extname(filePath).toLowerCase();
  return MIME_TYPES[extension] || "application/octet-stream";
}

function toHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function resolveStaticFile(pathname, clientDir) {
  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replace(/^[/\\]+/, "");
  const absolutePath = resolve(clientDir, normalized);
  const relativePath = relative(clientDir, absolutePath);

  if (relativePath.startsWith("..") || isAbsolute(relativePath)) return null;
  if (!existsSync(absolutePath)) return null;

  const stats = statSync(absolutePath);
  return stats.isFile() ? absolutePath : null;
}

async function applySecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set(
    "Content-Security-Policy",
    CONTENT_SECURITY_POLICY_DIRECTIVES.join("; "),
  );
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createStaticResponse(request, url, clientDir) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  if (!url.pathname || url.pathname.endsWith("/")) return null;

  const filePath = resolveStaticFile(url.pathname, clientDir);
  if (!filePath) return null;

  const headers = new Headers({
    "Content-Type": getContentType(filePath),
    "Cache-Control": url.pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=3600",
  });
  const body =
    request.method === "HEAD" ? null : Readable.toWeb(createReadStream(filePath));

  return new Response(body, { status: 200, headers });
}

export async function handleAppRequest(
  request,
  { clientDir = defaultClientDir } = {},
) {
  const url = new URL(request.url);
  const staticResponse = createStaticResponse(request, url, clientDir);
  const response = staticResponse ?? (await serverEntry.fetch(request));
  return await applySecurityHeaders(response);
}

function appendSetCookie(res, value) {
  const existing = res.getHeader("set-cookie");
  if (!existing) {
    res.setHeader("set-cookie", value);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader("set-cookie", [...existing, value]);
    return;
  }
  res.setHeader("set-cookie", [String(existing), value]);
}

export function startServer({
  port = Number(process.env.PORT || 3000),
  host = process.env.HOST || "127.0.0.1",
  clientDir = defaultClientDir,
  authorizeRequest,
} = {}) {
  const server = createServer(async (req, res) => {
    try {
      if (authorizeRequest && !authorizeRequest(req)) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Forbidden");
        return;
      }

      const hostHeader = req.headers.host || `${host}:${port}`;
      const protocol = (req.headers["x-forwarded-proto"] || "http")
        .toString()
        .split(",")[0]
        .trim();
      const url = new URL(req.url || "/", `${protocol}://${hostHeader}`);
      const method = (req.method || "GET").toUpperCase();
      const hasBody = method !== "GET" && method !== "HEAD";
      const init = {
        method,
        headers: toHeaders(req.headers),
      };

      if (hasBody) {
        init.body = Readable.toWeb(req);
        init.duplex = "half";
      }

      const request = new Request(url, init);
      const response = await handleAppRequest(request, { clientDir });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") {
          appendSetCookie(res, value);
        } else {
          res.setHeader(key, value);
        }
      });

      if (method === "HEAD" || !response.body) {
        res.end();
        return;
      }

      Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
      console.error("Server error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
      }
      res.end("Internal Server Error");
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      const resolvedPort =
        address && typeof address === "object" ? address.port : port;
      resolvePromise({
        server,
        url: `http://${host}:${resolvedPort}`,
      });
    });
  });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPath === fileURLToPath(import.meta.url)) {
  const { url } = await startServer();
  console.log(`Server running at ${url}`);
}
