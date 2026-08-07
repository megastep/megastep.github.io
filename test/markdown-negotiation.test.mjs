import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptsMarkdown,
  markdownAssetPath,
  onRequest,
} from "../functions/_middleware.js";

test("detects an acceptable Markdown media range", () => {
  assert.equal(acceptsMarkdown("text/markdown"), true);
  assert.equal(acceptsMarkdown("text/html, text/markdown; q=0.8"), false);
  assert.equal(acceptsMarkdown("text/html;q=1, text/markdown;q=0.1"), false);
  assert.equal(acceptsMarkdown("text/html;q=0.5, text/markdown;q=0.8"), true);
  assert.equal(acceptsMarkdown("text/markdown, */*"), true);
  assert.equal(acceptsMarkdown("*/*"), false);
  assert.equal(acceptsMarkdown("text/markdown;q=0"), false);
  assert.equal(acceptsMarkdown("text/html"), false);
});

test("maps public page paths to generated Markdown assets", () => {
  assert.equal(markdownAssetPath("/"), "/agent-markdown/index.md");
  assert.equal(markdownAssetPath("/resume/"), "/agent-markdown/resume/index.md");
  assert.equal(markdownAssetPath("/resume"), "/agent-markdown/resume/index.md");
  assert.equal(markdownAssetPath("/resume/index.html"), "/agent-markdown/resume/index.md");
  assert.equal(markdownAssetPath("/../resume/"), null);
  assert.equal(markdownAssetPath("/%2e%2e/resume/"), null);
  assert.equal(markdownAssetPath("/style.css"), null);
});

test("leaves browser content intact and varies only HTML responses", async () => {
  const html = new Response("<html>browser</html>", {
    headers: { "Content-Type": "text/html" },
  });
  const htmlResponse = await onRequest({
    request: new Request("https://example.com/", { headers: { Accept: "text/html" } }),
    next: async () => html,
    env: { ASSETS: { fetch: async () => assert.fail("Markdown asset should not be fetched") } },
  });
  assert.equal(await htmlResponse.text(), "<html>browser</html>");
  assert.equal(htmlResponse.headers.get("Vary"), "Accept");

  const cssResponse = await onRequest({
    request: new Request("https://example.com/style.css", { headers: { Accept: "text/css,*/*;q=0.1" } }),
    next: async () => new Response("body {}", { headers: { "Content-Type": "text/css" } }),
    env: { ASSETS: { fetch: async () => assert.fail("Markdown asset should not be fetched") } },
  });
  assert.equal(cssResponse.headers.get("Vary"), null);
});

test("serves the generated variant with negotiation headers", async () => {
  let fetchedUrl;
  const response = await onRequest({
    request: new Request("https://example.com/resume/", {
      headers: { Accept: "text/html, text/markdown" },
    }),
    next: async () => assert.fail("HTML fallback should not be used"),
    env: {
      ASSETS: {
        fetch: async (request) => {
          fetchedUrl = request.url;
          return new Response("---\ntitle: Resume\n---\n\n# Experience\n", {
            headers: {
              "Cache-Control": "public, max-age=3600",
              "Content-Type": "text/markdown",
              ETag: "old-html-tag",
            },
          });
        },
      },
    },
  });

  assert.equal(fetchedUrl, "https://example.com/agent-markdown/resume/index.md");
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.equal(response.headers.get("ETag"), null);
  assert.match(response.headers.get("x-markdown-tokens"), /^\d+$/);
  assert.match(await response.text(), /# Experience/);
});

test("serves HEAD metadata without reading a Markdown body", async () => {
  let fetchedMethod;
  const response = await onRequest({
    request: new Request("https://example.com/resume/", {
      method: "HEAD",
      headers: { Accept: "text/markdown" },
    }),
    next: async () => assert.fail("HTML fallback should not be used"),
    env: {
      ASSETS: {
        fetch: async (request) => {
          fetchedMethod = request.method;
          return new Response(null, {
            headers: {
              "Content-Length": "40",
              "Content-Type": "text/markdown",
            },
          });
        },
      },
    },
  });

  assert.equal(fetchedMethod, "HEAD");
  assert.equal(response.headers.get("Content-Length"), "40");
  assert.equal(response.headers.get("x-markdown-tokens"), "10");
  assert.equal(await response.text(), "");
});

test("rejects the Pages HTML fallback for a missing Markdown asset", async () => {
  const response = await onRequest({
    request: new Request("https://example.com/resume/", {
      headers: { Accept: "text/markdown" },
    }),
    next: async () => new Response("<html>browser fallback</html>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
    env: {
      ASSETS: {
        fetch: async () => new Response("<html>asset fallback</html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      },
    },
  });

  assert.equal(response.headers.get("Content-Type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.equal(response.headers.get("x-markdown-tokens"), null);
  assert.equal(await response.text(), "<html>browser fallback</html>");
});
