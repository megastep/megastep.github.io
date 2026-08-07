import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptsMarkdown,
  markdownAssetPath,
  onRequest,
} from "../functions/_middleware.js";

test("detects an acceptable Markdown media range", () => {
  assert.equal(acceptsMarkdown("text/markdown"), true);
  assert.equal(acceptsMarkdown("text/html, text/markdown; q=0.8"), true);
  assert.equal(acceptsMarkdown("text/markdown;q=0"), false);
  assert.equal(acceptsMarkdown("text/html"), false);
});

test("maps public page paths to generated Markdown assets", () => {
  assert.equal(markdownAssetPath("/"), "/__markdown/index.md");
  assert.equal(markdownAssetPath("/resume/"), "/__markdown/resume/index.md");
  assert.equal(markdownAssetPath("/resume"), "/__markdown/resume/index.md");
  assert.equal(markdownAssetPath("/resume/index.html"), "/__markdown/resume/index.md");
  assert.equal(markdownAssetPath("/style.css"), null);
});

test("leaves browser requests on the HTML path", async () => {
  const html = new Response("<html>browser</html>", {
    headers: { "Content-Type": "text/html" },
  });
  const response = await onRequest({
    request: new Request("https://example.com/", { headers: { Accept: "text/html" } }),
    next: async () => html,
    env: { ASSETS: { fetch: async () => assert.fail("Markdown asset should not be fetched") } },
  });

  assert.equal(response, html);
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
            headers: { "Cache-Control": "public, max-age=3600", ETag: "old-html-tag" },
          });
        },
      },
    },
  });

  assert.equal(fetchedUrl, "https://example.com/__markdown/resume/index.md");
  assert.equal(response.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  assert.equal(response.headers.get("Vary"), "Accept");
  assert.equal(response.headers.get("ETag"), null);
  assert.match(response.headers.get("x-markdown-tokens"), /^\d+$/);
  assert.match(await response.text(), /# Experience/);
});
