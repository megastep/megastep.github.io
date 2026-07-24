---
name: resume-pdf
description: Build, update, and verify this repository's printable resume PDF. Use when changing the resume content or print layout, generating files/StephanePeter-web.pdf, diagnosing PDF pagination, or preparing the resume for PDF delivery.
---

# Resume PDF

Use the repository's printable route and renderer; do not print the interactive `/resume/` page.

## Source surfaces

- Keep shared resume content in `_includes/resume_content.html` so `/resume/` and `/resume/print/` stay aligned.
- Use `resume-print.html` for the print route and `_layouts/resume.html` for printable-page behavior.
- Make print-only layout changes in the print rules in `_includes/css/main.css`.
- Keep `files/StephanePeter-web.pdf` generated and ignored; do not commit it.

## Build and inspect

1. Install Chromium if it is unavailable:

   ```sh
   pnpm run setup:resume-pdf
   ```

2. Generate the production-configured PDF:

   ```sh
   pnpm run render:resume-pdf
   ```

   The renderer builds Jekyll, serves `_site`, visits `/resume/print/`, and writes `files/StephanePeter-web.pdf`.

3. Confirm the artifact has Letter pages and a sensible page count:

   ```sh
   pdfinfo files/StephanePeter-web.pdf
   ```

4. Rasterize and visually inspect every page after layout changes:

   ```sh
   mkdir -p /private/tmp/resume-pdf-pages
   pdftoppm -png -r 144 files/StephanePeter-web.pdf /private/tmp/resume-pdf-pages/page
   ```

   Use the image-viewing tool on the generated PNGs. Check that the first page is populated, headings stay with their following content, no content is clipped, links are legible, and no interactive navigation or footer appears.

## Pagination changes

- Use a flowing two-column layout in print media: let the primary and aside wrappers use `display: contents` so sections continue into the next available column instead of reserving a fixed sidebar.
- Preserve `break-inside: avoid` for individual `.resume-role` entries.
- Do not apply `break-inside: avoid` to an entire `.resume-section`; long sections can force a mostly blank preceding page.
- Keep section headings and role headings with their following content using `break-after: avoid`.
- Maintain the light-only printable theme and `@page` Letter size.

## Validate

Run both Jekyll builds after source or styling changes:

```sh
bundle exec jekyll build
bundle exec jekyll build --config _config.yml,_config_prod.yml
git diff --check
```

Ensure Jekyll exclusions still prevent `node_modules`, `package.json`, `pnpm-lock.yaml`, `scripts`, and the generated PDF from appearing in `_site`.
