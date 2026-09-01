const DEFAULT_JSON_LIMIT = 1024 * 1024;

export async function readJsonBody<T>(
  request: Request,
  maxBytes = DEFAULT_JSON_LIMIT
): Promise<T> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Response("Request body is too large", { status: 413 });
  }

  if (!request.body) {
    throw new Response("Request body is required", { status: 400 });
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Response("Request body is too large", { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(body)) as T;
  } catch {
    throw new Response("Invalid JSON request body", { status: 400 });
  }
}

export function toErrorResponse(error: unknown, fallback: string) {
  if (error instanceof Response) {
    return error;
  }

  console.error(fallback, error);
  return Response.json({ error: fallback }, { status: 500 });
}
