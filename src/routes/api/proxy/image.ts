import { createFileRoute } from "@tanstack/react-router";
import { validateRemoteHttpUrl } from "@/lib/server/safeUrl";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function fetchImage(rawUrl: string, redirectCount = 0): Promise<Response> {
  const url = await validateRemoteHttpUrl(rawUrl);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent": "Magic Resume Image Proxy",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirectCount >= MAX_REDIRECTS) {
      throw new Error("Too many image redirects");
    }
    const location = response.headers.get("location");
    if (!location) throw new Error("Image redirect is missing a location");
    return fetchImage(new URL(location, url).toString(), redirectCount + 1);
  }

  return response;
}

async function readLimitedBody(response: Response) {
  if (!response.body) throw new Error("Image response has no body");

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    throw new Error("Image exceeds the 10 MB limit");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("Image exceeds the 10 MB limit");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export const Route = createFileRoute("/api/proxy/image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const imageUrl = new URL(request.url).searchParams.get("url");
        if (!imageUrl) {
          return Response.json({ error: "缺少图片URL参数" }, { status: 400 });
        }

        try {
          const response = await fetchImage(imageUrl);
          if (!response.ok) {
            return Response.json(
              { error: `获取图片失败: ${response.status} ${response.statusText}` },
              { status: 502 }
            );
          }

          const contentType = response.headers
            .get("content-type")
            ?.split(";", 1)[0]
            .trim()
            .toLowerCase();
          if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) {
            return Response.json(
              { error: "远程资源不是受支持的图片格式" },
              { status: 415 }
            );
          }

          const imageBody = await readLimitedBody(response);
          if (imageBody.byteLength === 0) {
            return Response.json({ error: "图片内容为空" }, { status: 400 });
          }

          return new Response(imageBody, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "处理图片请求失败";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },
  },
});
