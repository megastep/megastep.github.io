# Repository Guidelines

## Project Structure & Module Organization
This repository is a Jekyll-based personal site. Content and templates are split by Jekyll convention:
- `_posts/`: dated Markdown posts (`YYYY-MM-DD-title.markdown`).
- `_layouts/`: page templates (`default.html`, `article.html`).
- `_includes/`: reusable partials (navigation, footer, sections, CSS includes).
- `img/`, `js/`, `css/`, and root icon files: static assets served as-is.
- `_site/`: generated output; treat as build artifact.
- Config lives in `_config.yml` (default) and `_config_prod.yml` (production overrides).

## Build, Test, and Development Commands
Use Bundler to ensure consistent gem versions.
- `bundle install`: install Ruby dependencies from `Gemfile`.
- `bundle exec jekyll serve --livereload`: run local dev server with rebuilds.
- `bundle exec jekyll build`: generate static site into `_site/`.
- `bundle exec jekyll build --config _config.yml,_config_prod.yml`: build with production config layering.

This project does not currently define an automated unit test suite; treat successful Jekyll builds as the baseline validation.

## Coding Style & Naming Conventions
- Use 2-space indentation in HTML/Liquid/YAML to match existing files.
- Keep front matter keys lowercase with hyphenated names where already used (for example `modal-id`, `project-date`).
- Preserve existing filename patterns: posts must stay date-prefixed; includes/layouts use lowercase snake/kebab style.
- Prefer small, reusable partials in `_includes/` over duplicating markup.

## Testing Guidelines
Before opening a PR:
- Run `bundle exec jekyll build` and ensure no build errors.
- Spot-check changed pages locally via `bundle exec jekyll serve`.
- For content changes, verify links, images, and front matter render correctly.

## Commit & Pull Request Guidelines
Recent history favors concise, imperative commit messages (for example `Update social links`, `Handle redirects with Cloudflare entirely`) and dependency bumps (`Bump rexml from ... to ...`).
- Keep commits focused and descriptive.
- In PRs, include: summary of user-visible changes, affected paths, and screenshots for layout/UI edits.
- Link related issue/PR context when applicable.

## Security & Configuration Tips
- Do not commit secrets or private tokens in config/content files.
- Review changes to `headers`, `redirects`, and contact form files (`mail/`, `_includes/contact*.html`) carefully; they affect production behavior.
