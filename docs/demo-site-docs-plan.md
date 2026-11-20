# Plan: one docs site (move demo.agilitycms.com/docs into agilitycms.com/docs)

Joel, 2026-11-20: "I'd actually just like to bring the demo site content into our main docs site. Weird to have 2 places for docs."

Status: **proposed**. Three decisions are needed before any work (section 2).

## 1. What exists today

**demo.agilitycms.com/docs** is a second docs site. It is rendered by the demo repo (`agility/nextjs-demo-site-2026`) from 35 Markdown files in its `docs/` folder, about 25,000 words. It has its own renderer (`src/app/docs`, `src/lib/docs`), navigation, header and sitemap entries. It is the only part of the demo site that Google and Bing are allowed to index (demo `robots.txt` and the `X-Robots-Tag` in `src/proxy.ts`).

**It is the second half of something we already moved.** The docs site's Training Guide (`/docs/training-guide`, 41 articles) is the generic half of the same material: the same four roles (content editor, admin, architect, developer), and the same screenshots, already on our CDN under `agility-cms-docs/images/training-guide/`. The demo docs are the demo-specific half that was never moved. The demo `README.md` says so: "For generic Agility CMS concepts and training, see the official Agility CMS Training Guide."

**Some of it is already in the docs site twice:**

| Demo file | Already in docs as | Notes |
|---|---|---|
| `agility-pic-component.md` | `/nextjs/using-the-agilitypic-component-for-responsive-images` | Same article; the two copies have drifted (about 130 lines differ) |
| `image-recos.md` | `/overview/image-best-practices` | Generic, not demo-specific |

**The docs site already points at the demo docs.** "Using the Advanced Next.js Demo Site" (`/docs/nextjs/using-the-advanced-next-js-demo-site`, item 1377 in `NextjsArticles`) is the entry point, with about 12 links into `demo.agilitycms.com/docs/...`. "A/B/n Testing in Agility CMS" (1443, `OwnersAdminsArticles`) uses the demo as its reference implementation. The marketing instance has no links to the demo docs.

**The docs site can take this content without code changes.** `DocArticle` has a `markdownContent` field. It renders GFM and raw HTML, strips the leading `# H1` and uses it as the title, and the same Markdown comes back from `/docs/{path}.md` and the MCP server. A category is a pair of containers (`*Articles` + `*Sections`) plus a sitemap folder with a dynamic page. That is CMS content, not code. (Confirm in phase 1 that `SideBarNav`, the header nav and `doccategories` pick up a new category without code; nothing found hard-codes the current ones.)

## 2. Decisions for Joel

### D1. Where the text is maintained

The demo docs describe the demo code: environment variables, API routes, project structure. The demo `AGENTS.md` tells agents to update `docs/` in the same PR as a code change. And when sales clones the demo for a prospect's POC, the docs travel with the repo.

- **A. The repo stays the source; a script publishes it to the docs instance (recommended).** Docs keep changing in the same PR as the code, POC clones keep their docs, and readers see one site. The cost is a sync script (phase 2). Editing those articles in the CMS would be overwritten, so each item's `NoteInternal` says "generated from nextjs-demo-site-2026/docs; edit there".
- **B. Move once; the CMS becomes the source; delete `docs/` from the repo.** Simpler now, no script. But docs drift from the code (an agent changing the code can't update them in its PR), and POC clones ship with no docs.

### D2. Where the pages live

- **A. A new category, `/docs/demo-site/...` (recommended).** Containers `DemoSiteArticles` + `DemoSiteSections`, with sections that mirror the Training Guide: Overview, Content editors, Administrators, Architects, Developers. Hidden from the top nav, reached from the Next.js category's demo article (1377) and from each Training Guide track ("see it in the demo site").
- **B. Inside the Next.js category, `/docs/nextjs/demo-site-...`.** No new category, but it more than doubles Next.js (21 articles now), and the editor/admin/architect pages aren't Next.js content.

### D3. Publishing

The docs rule (execution plan, "Rules for every item") is that everything is saved to Staging and a named person reviews and publishes.

- **Recommended:** the first import is saved to Staging and reviewed once as a batch. After that, the sync publishes changes on merge to the demo repo's `main`, since the PR review is the review.
- **Alternative:** every sync saves to Staging and someone publishes by hand.

## 3. What moves

Article slugs follow the Training Guide's pattern (`{role}-{topic}`). With D2-A the URLs are `/docs/demo-site/{slug}`.

| Demo file | Words | Slug in /docs/demo-site | Action |
|---|---|---|---|
| `README.md` | 283 | (category landing) | Move. Becomes the `/demo-site` landing text |
| `content-editor/README.md` | 359 | `content-editor-overview` | Move |
| `content-editor/pages.md` | 463 | `content-editor-pages` | Move |
| `content-editor/components.md` | 860 | `content-editor-components` | Move |
| `content-editor/content-models.md` | 733 | `content-editor-content-models` | Move |
| `content-editor/common-tasks.md` | 732 | `content-editor-common-tasks` | Move |
| `admin/README.md` | 119 | `admin-overview` | Move |
| `admin/configuration.md` | 259 | `admin-configuration` | Move |
| `admin/content-setup.md` | 357 | `admin-content-setup` | Move |
| `admin/component-setup.md` | 215 | `admin-component-setup` | Move |
| `admin/workflows.md` | 300 | `admin-workflows` | Move |
| `architect/README.md` | 167 | `architect-overview` | Move |
| `architect/architecture.md` | 474 | `architect-architecture` | Move |
| `architect/content-architecture.md` | 605 | `architect-content-architecture` | Move |
| `architect/component-architecture.md` | 479 | `architect-component-architecture` | Move |
| `architect/integrations.md` | 345 | `architect-integrations` | Move |
| `developer/README.md` | 297 | `developer-overview` | Move |
| `developer/codebase/README.md` | 366 | `developer-codebase` | Move |
| `developer/codebase/project-structure.md` | 901 | `developer-project-structure` | Move |
| `developer/codebase/components.md` | 671 | `developer-components` | Move |
| `developer/codebase/content-models.md` | 626 | `developer-content-models` | Move |
| `developer/codebase/api-routes.md` | 631 | `developer-api-routes` | Move |
| `developer/codebase/deployment.md` | 542 | `developer-deployment` | Move |
| `developer/ENVIRONMENT_VARIABLES.md` | 487 | `developer-environment-variables` | Move |
| `developer/MULTI_LOCALE_IMPLEMENTATION.md` | 825 | `developer-multi-locale` | Move. Cross-link the generic `/nextjs/multi-locale-support-with-next-js` |
| `developer/AUDIENCE_REGION_SYSTEM.md` | 985 | `developer-audience-and-region` | Move |
| `developer/VIEW_TRANSITIONS.md` | 334 | `developer-view-transitions` | Move |
| `developer/AB_TESTING.md` | 1,042 | `developer-ab-testing` | Move. Cross-link `/owners-admins/a-b-n-testing-in-agility-cms` |
| `developer/ANALYTICS_INTEGRATION.md` | 1,983 | `developer-analytics` | Move. Cross-link `/apps/posthog` |
| `agility-pic-component.md` | 1,905 | (none) | **Drop.** Already at `/nextjs/using-the-agilitypic-component-for-responsive-images`; fold any newer demo-side edits into that article first |
| `image-recos.md` | 3,817 | (none) | **Drop.** Already at `/overview/image-best-practices`; same check |
| `AGILITY_CMS_URL_PATTERNS.md` | 1,049 | (none, or a generic developers article) | Not demo-specific: it documents the Agility app's URLs. Keep in the repo as an agent reference; optionally publish once as a generic `/developers` article |
| `POSTHOG_IMPLEMENTATION.md` | 832 | (none) | **Review.** Dated 2026-01-28; `ANALYTICS_INTEGRATION.md` and `AB_TESTING.md` look like its successors. Fold anything still true into those, then delete |
| `developer/ANALYTICS_DASHBOARD.md` | 934 | (none) | **Keep in the repo only.** It describes our private PostHog dashboard (project and dashboard IDs), which readers can't open |
| `assets/README.md` | 217 | (none) | Repo-internal. Keep |

That's 28 articles plus the landing, about 16,500 words. Text moves verbatim. The brand-voice check exempts verbatim ports, but the "Contact our sales team ... we'll clone this solution for you" block in the README gets a voice check because it's a CTA.

**Images:** all 13 image references are already absolute URLs on `cdn.aglty.io/agility-cms-docs/...`, so nothing to upload. The 60 files in `docs/assets/` (with `.jpeg`/`.png` duplicates) aren't referenced by the Markdown. They stay in the repo.

## 4. Work

### Phase 1: docs instance (`67bc73e6-u`)

1. Containers `DemoSiteArticles` (model `DocArticle`) and `DemoSiteSections` (model `DocSection`). Five sections: Overview, Content editors, Administrators, Architects, Developers.
2. Sitemap folder page `/demo-site` (landing: README text, plus a link card per section) and its dynamic page bound to `DemoSiteArticles`. Hidden from the menu (D2-A).
3. A `doccategories` item so search indexing and category cards include it.
4. Check on a preview, with no code change: sidebar, breadcrumbs, `.md` output, `llms.txt`, sitemap.xml, JSON-LD, canonical.

Known traps for this instance, from the website repo's memory: a management-API save replaces the whole field set; `save_page` can stamp a `pullDate` that auto-unpublishes; `reorder_page_modules` re-parents a page to the root.

### Phase 2: the sync script (D1-A)

`scripts/publish-docs.mts` in the demo repo. For each file in the section 3 mapping:

- Rewrite links: relative `.md` links to `/docs/demo-site/{slug}` (resolved from the **file's** location, the bug PR #37 fixed in the demo renderer); links to dropped files to their docs-site equivalents; `#anchors` kept.
- Upsert the `DocArticle` by slug: `title` from the H1, `description` from the first paragraph (or front matter if added), `markdownContent`, `section`. The mapping table lives in the script, so a new file fails loudly until it's mapped.
- Save to Staging; publish only with `--publish` (D3).
- `--dry-run` prints the diff per article.

The first run is the import. Then a GitHub Action on `main`, path filter `docs/**`, with a docs-instance management token as a repo secret, and Algolia reindex via the existing `indexArticle` webhook (automatic on publish).

(D1-B instead: run the same script once, then delete `docs/` from the repo.)

### Phase 3: links into the new pages

- Docs 1377 ("Using the Advanced Next.js Demo Site"): every `demo.agilitycms.com/docs/...` link becomes `/docs/demo-site/...`. Check 1443 the same way.
- Training Guide track landings: one "See it in the demo site" link each.
- Demo repo `README.md`, `AGENTS.md`, and the GitHub repo description.

### Phase 4: retire the demo's /docs (demo repo PR)

1. Redirects (301) in `next.config.mjs`: `/docs` to `https://agilitycms.com/docs/demo-site`, and every old path (and its `.md` variant) to its new URL, from the same mapping table. Dropped files go to their docs-site equivalents; anything unmapped goes to the landing.
2. Delete `src/app/docs/`, `src/lib/docs/`, the docs entries in `src/app/sitemap.tsx`, and `"/docs"` in `src/lib/cms/publishedPaths.ts`.
3. Robots: after the move, nothing on the demo site is meant for Google or Bing. Update the `robots.txt` comment and the proxy's `isDocsPath` exception (`src/proxy.ts`) so the noindex rule covers the whole site.
4. `AGENTS.md`: replace the "In-Site Documentation System" section with: docs live in `docs/`, publish to agilitycms.com/docs/demo-site, edit the Markdown and the sync does the rest.

### Phase 5: verify

- Every old demo URL returns a 301 to a page that returns 200 (scripted from the mapping table).
- Ahrefs (Tuesday crawl) and Semrush (Monday): no new 404s; the demo 404 group is gone for good.
- Docs search, the MCP `search_docs`, and `/docs/llms.txt` find the new articles.

## 5. Order and size

Phase 1 then 2 then 3 then 4, with 4 shipped only after the new pages are published (the redirects point at them). Rough size: phase 1 is an hour of CMS work; phase 2 is the bulk (script, mapping, review of 28 imported articles); phases 3 and 4 are small PRs.

Demo PR #37 (Ahrefs fixes, 2026-11-20) is still worth merging first: its hreflang and language-switcher fixes are unrelated to this, and its docs-link fix keeps the old pages correct until phase 4.

## 6. Not in scope

- Changing what the demo docs say (verbatim port; corrections go through the normal repo PR afterwards).
- The 60 local screenshots in `docs/assets/`.
- Merging the demo or docs repos (Joel kept the docs repo separate on 2026-11-13).
