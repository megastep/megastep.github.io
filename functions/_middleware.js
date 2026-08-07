const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const MARKDOWN_DIRECTORY = "/__markdown";

export function acceptsMarkdown(acceptHeader) {
  if (!acceptHeader) return false;

  return acceptHeader.split(",").some((range) => {
    const [mediaType, ...parameters] = range.trim().toLowerCase().split(";");
    if (mediaType !== "text/markdown") return false;

    const quality = parameters
      .map((parameter) => parameter.trim())
      .find((parameter) => parameter.startsWith("q="));
    return quality === undefined || Number.parseFloat(quality.slice(2)) > 0;
  });
}

export function markdownAssetPath(pathname) {
  if (pathname.endsWith("/")) {
    return `${MARKDOWN_DIRECTORY}${pathname}index.md`;
  }

  if (pathname.endsWith(".html")) {
    return `${MARKDOWN_DIRECTORY}${pathname.slice(0, -5)}.md`;
  }

  if (!pathname.split("/").at(-1).includes(".")) {
    return `${MARKDOWN_DIRECTORY}${pathname}/index.md`;
  }

  return null;
}

function appendVary(headers, value) {
  const existing = headers.get("Vary");
  const values = existing ? existing.split(",").map((item) => item.trim()) : [];
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) {
    values.push(value);
  }
  headers.set("Vary", values.join(", "));
}

function estimateTokenCount(markdown) {
  return Math.ceil(new TextEncoder().encode(markdown).byteLength / 4);
}

export async function onRequest(context) {
  const { request } = context;
  if (
    !["GET", "HEAD"].includes(request.method) ||
    !acceptsMarkdown(request.headers.get("Accept"))
  ) {
    return context.next();
  }

  const requestUrl = new URL(request.url);
  const assetPath = markdownAssetPath(requestUrl.pathname);
  if (!assetPath) return context.next();

  const assetUrl = new URL(assetPath, requestUrl.origin);
  const assetResponse = await context.env.ASSETS.fetch(new Request(assetUrl));
  if (!assetResponse.ok) return context.next();

  const markdown = await assetResponse.text();
  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", MARKDOWN_CONTENT_TYPE);
  headers.set("Content-Length", String(new TextEncoder().encode(markdown).byteLength));
  headers.set("x-markdown-tokens", String(estimateTokenCount(markdown)));
  appendVary(headers, "Accept");
  for (const header of ["Content-Encoding", "Content-Range", "ETag", "Last-Modified", "Transfer-Encoding"]) {
    headers.delete(header);
  }

  return new Response(request.method === "HEAD" ? null : markdown, {
    status: assetResponse.status,
    headers,
  });
}
