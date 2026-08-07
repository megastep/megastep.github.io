const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const MARKDOWN_DIRECTORY = "/__markdown";

function parseMediaRange(range) {
  const [mediaType, ...parameters] = range.trim().toLowerCase().split(";");
  const qualityParameter = parameters
    .map((parameter) => parameter.trim())
    .find((parameter) => parameter.startsWith("q="));
  const quality = qualityParameter === undefined
    ? 1
    : Number.parseFloat(qualityParameter.slice(2));

  return {
    mediaType,
    quality: Number.isFinite(quality) && quality >= 0 && quality <= 1 ? quality : 0,
  };
}

function matchQuality(ranges, target) {
  const [targetType] = target.split("/");
  let best = { quality: 0, specificity: -1 };

  for (const range of ranges) {
    const specificity = range.mediaType === target
      ? 2
      : range.mediaType === `${targetType}/*`
        ? 1
        : range.mediaType === "*/*"
          ? 0
          : -1;
    if (
      specificity > best.specificity ||
      (specificity === best.specificity && range.quality > best.quality)
    ) {
      best = { quality: range.quality, specificity };
    }
  }

  return best;
}

export function acceptsMarkdown(acceptHeader) {
  if (!acceptHeader) return false;

  const ranges = acceptHeader.split(",").map(parseMediaRange);
  const markdown = matchQuality(ranges, "text/markdown");
  const html = matchQuality(ranges, "text/html");
  const explicitlyRequestsMarkdown = ranges.some(
    (range) => range.mediaType === "text/markdown" && range.quality > 0,
  );

  return explicitlyRequestsMarkdown && (
    markdown.quality > html.quality ||
    (markdown.quality === html.quality && markdown.specificity >= html.specificity)
  );
}

export function markdownAssetPath(pathname) {
  const hasTraversalSegment = pathname.split("/").some((segment) => {
    try {
      return [".", ".."].includes(decodeURIComponent(segment));
    } catch {
      return true;
    }
  });
  if (hasTraversalSegment) return null;

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

async function nextWithHtmlVary(context) {
  const response = await context.next();
  if (!response.headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
    return response;
  }

  const headers = new Headers(response.headers);
  appendVary(headers, "Accept");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const { request } = context;
  if (
    !["GET", "HEAD"].includes(request.method) ||
    !acceptsMarkdown(request.headers.get("Accept"))
  ) {
    return nextWithHtmlVary(context);
  }

  const requestUrl = new URL(request.url);
  const assetPath = markdownAssetPath(requestUrl.pathname);
  if (!assetPath) return nextWithHtmlVary(context);

  const assetUrl = new URL(assetPath, requestUrl.origin);
  if (!assetUrl.pathname.startsWith(`${MARKDOWN_DIRECTORY}/`)) {
    return nextWithHtmlVary(context);
  }

  const assetResponse = await context.env.ASSETS.fetch(new Request(assetUrl, {
    method: request.method,
  }));
  if (!assetResponse.ok) return nextWithHtmlVary(context);

  const headers = new Headers(assetResponse.headers);
  headers.set("Content-Type", MARKDOWN_CONTENT_TYPE);
  appendVary(headers, "Accept");
  for (const header of ["Content-Encoding", "Content-Range", "ETag", "Last-Modified", "Transfer-Encoding"]) {
    headers.delete(header);
  }

  let body = null;
  if (request.method === "HEAD") {
    const contentLength = Number.parseInt(headers.get("Content-Length"), 10);
    if (Number.isFinite(contentLength) && contentLength >= 0) {
      headers.set("x-markdown-tokens", String(Math.ceil(contentLength / 4)));
    } else {
      headers.delete("x-markdown-tokens");
    }
  } else {
    body = await assetResponse.text();
    headers.set("Content-Length", String(new TextEncoder().encode(body).byteLength));
    headers.set("x-markdown-tokens", String(estimateTokenCount(body)));
  }

  return new Response(body, {
    status: assetResponse.status,
    headers,
  });
}
