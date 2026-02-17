# Napkin

## 2026-02-17
- Noted repository has no existing `.claude/napkin.md`; created it per session rule.
- Verified project is a Jekyll static site; contributor guide should prioritize Bundler/Jekyll workflows.
- Added `AGENTS.md` contributor guide (338 words) with Jekyll-specific commands and conventions.
- Completed full SEO audit of https://stephanepeter.com/
  - Score: 64/100 (Good, but needs improvement)
  - Key findings: Missing H1 tags, outdated Bootstrap 3.3.6, stale content (2014), locale conflicts
  - Created 3 comprehensive reports in `seo/` directory:
    - FULL-AUDIT-REPORT.md (detailed 64/100 analysis)
    - ACTION-PLAN.md (23 prioritized recommendations)
    - EXECUTIVE-SUMMARY.md (quick overview)
  - Quick wins identified: 40 minutes of fixes can improve score to 72/100
  - Critical issues: Missing H1, no hreflang tags, mixed language content without proper declarations
- Implemented SEO remediation changes across templates/layouts/content/sitemap and added validation notes under `seo/`.
- Ran into Lighthouse limitation: CLI installed via temporary npm cache, but audit failed because Chrome is unavailable in current environment.
- Corrected two implementation mistakes during verification: removed duplicate TechArticle JSON-LD and tightened sitemap filtering to exclude non-HTML asset URLs.
- Implemented Bootstrap 5 + vanilla JS migration on `codex/seo-remediation-implementation` by replacing Bootstrap/jQuery runtime includes and converting nav/modal/grid markup to Bootstrap 5 attributes/classes.
- Added `js/site.js` to replace legacy jQuery behaviors (smooth scroll, navbar shrink, mobile collapse close, scrollspy, floating labels).
- Re-hit Jekyll `_site` concurrent build race when running two builds in parallel; sequential builds are required for reliable validation.
- Initially added a new checklist file under `seo/`, then realized `.gitignore` excludes new `seo/*` files; moved checklist content into tracked `seo/BOOTSTRAP-JQUERY-MIGRATION-EPIC.md` instead.
- Added `/llms.txt` and updated `/robots.txt` to allow crawler discovery of llms guidance while keeping sitemap directive.
- Addressed final PR thread set for migration follow-up: added SRI/referrerpolicy to Bootstrap CDN assets, restored keyboard focus-visible styling, corrected sitemap exclusion logic, normalized article lang BCP-47 output, tightened hreflang self-language behavior, and restored non-static contact script path.
- Revalidated with sequential default + production Jekyll builds; both passed.
