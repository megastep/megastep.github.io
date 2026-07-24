import { execFileSync } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const site = join(root, "_site");
const output = resolve(root, process.env.RESUME_PDF_OUTPUT ?? "files/StephanePeter-web.pdf");
const mimeTypes = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };

execFileSync("bundle", ["exec", "jekyll", "build", "--config", "_config.yml,_config_prod.yml"], { cwd: root, stdio: "inherit" });

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const file = normalize(join(site, pathname === "/" ? "index.html" : pathname, pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(site) || !existsSync(file)) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "Content-Type": mimeTypes[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
});

await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
const { port } = server.address();

try {
  await mkdir(resolve(output, ".."), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/resume/print/`, { waitUntil: "networkidle" });
  await page.pdf({ path: output, format: "Letter", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(`Wrote ${output}`);
} finally {
  await new Promise((resolveServer) => server.close(resolveServer));
}
