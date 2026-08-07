# Stéphane Peter

Source for [stephanepeter.com](https://stephanepeter.com), a Jekyll-powered portfolio, writing archive, and résumé for Stéphane Peter.

The site uses the **Light Studio** design system: self-hosted Geist fonts, a teal accent, responsive editorial layouts, native project drawers, light and dark themes, and reduced-motion support. It is no longer based on or presented as the original Freelancer theme.

## Requirements

- Ruby and Bundler
- Node.js with the version of pnpm declared in `package.json`
- Chromium, only when generating the résumé PDF

## Local development

Install Ruby dependencies, then start Jekyll with live reload:

```sh
bundle install
bundle exec jekyll serve --livereload
```

The site is available at <http://localhost:4000>.

## Build

Build the standard site:

```sh
bundle exec jekyll build
```

Build with the production configuration used for deployment:

```sh
bundle exec jekyll build --config _config.yml,_config_prod.yml
```

Jekyll writes the generated site to `_site/`. Treat it as a build artifact.

## Résumé and PDF

The interactive résumé lives at `/resume/`; its print-friendly counterpart is `/resume/print/`. Both use the shared content in `_includes/resume_content.html`.

To generate the public PDF at `files/StephanePeter.pdf`:

```sh
pnpm install
pnpm run setup:resume-pdf # first time only
pnpm run render:resume-pdf
```

The renderer builds the production site, opens `/resume/print/` in headless Chromium, and writes a Letter-size PDF. Inspect the PDF after content or print-layout changes:

```sh
pdfinfo files/StephanePeter.pdf
pdftoppm -png -r 144 files/StephanePeter.pdf /private/tmp/resume-page
```

## Content and layout

- `_posts/` holds project and article content. Project posts supply the portfolio grid and native project drawers.
- `_includes/` contains the shared page sections, navigation, footer, project grid, dialogs, and résumé content.
- `_layouts/` defines homepage, article, and résumé shells.
- `_includes/css/main.css` contains the site tokens, responsive layout, theme behavior, and print styles.
- `js/site.js` provides theme selection, navigation, project-drawer behavior, and motion with a reduced-motion fallback.
- `img/`, `fonts/`, and `img/social/` contain the site’s local assets.

Keep project-post front matter and existing permalinks stable. Shared résumé updates belong in `_includes/resume_content.html`, not separately in `resume.html` and `resume-print.html`.

## Deployment configuration

Cloudflare Pages uses the production Jekyll configuration in `_config_prod.yml`. Static routing and response policy live in `redirects` and `headers`. Update `_config.yml` for site-wide metadata, contact details, social URLs, and the social links used by structured data.

Jekyll also generates formatting-stripped Markdown companions under `_site/__markdown/`. The Pages middleware in `functions/_middleware.js` serves those files when a page request includes `Accept: text/markdown`, then falls through to the static site for ordinary browser requests. This is implemented entirely by the repository and does not depend on Cloudflare's Markdown for Agents transformation.

Test content negotiation locally after a production build:

```sh
pnpm dlx wrangler@latest pages dev _site
curl -i http://localhost:8788/ -H 'Accept: text/markdown'
curl -i http://localhost:8788/ -H 'Accept: text/html'
```

## Validation checklist

Before publishing a change, run both Jekyll builds and check the diff:

```sh
bundle exec jekyll build
bundle exec jekyll build --config _config.yml,_config_prod.yml
pnpm test
git diff --check
```

For UI work, also check desktop and mobile layouts, keyboard navigation, both color themes, and reduced-motion behavior. For résumé work, regenerate and inspect `files/StephanePeter.pdf`.
