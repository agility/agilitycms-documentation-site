---
name: audit-framework-docs
description: Audit the Frameworks, SDKs & APIs documentation for staleness and drift — article inventories, unpublished/staging backlogs, empty or stub articles, nav-vs-content mismatches, dead-product references, and framework-version drift. Use on a cadence (monthly / pre-release) or whenever asked to check that framework docs are current. Read-only: it reports; it does not author, publish, or delete. Output feeds docs/content-refresh-plan-2026.md §3.
---

# Audit Framework / SDK / API Docs

A **read-only** health check over the **SDKs & Frameworks** category of the Agility CMS Docs instance. It finds drift — stale content, unpublished work stuck in staging, empty articles, nav that points at nothing, and framework versions that have moved on — and emits a report. It **does not** write, publish, or delete anything (the Agility MCP can't anyway). Remediation is driven by [docs/content-refresh-plan-2026.md](../../../docs/content-refresh-plan-2026.md) and authoring by the [authoring-agility-docs skill](../authoring-agility-docs/SKILL.md).

## Instance facts

- **Instance / GUID:** `Agility CMS Docs` — `67bc73e6-u`
- **Locale:** `en-us`
- **Published paths:** `https://agilitycms.com/docs/<framework-slug>/<article-slug>`

## What counts as a framework/SDK/API section

Every `<Name>Articles` container under category `SDKs-Frameworks` (categoryID 6). As of the last audit:

| Framework | Articles container | Sections container | Tier |
|---|---|---|---|
| Next.js | `NextjsArticles` (49) | `NextjsSections` (56) | 1 |
| .NET | `dotNetArticles` (53) | `dotNetSections` (60) | 1 |
| JavaScript (core SDK) | `JavaScriptArticles` (55) | `JavaScriptSections` (62) | 1 |
| Astro | `AstroArticles` (278) | `AstroSections` (277) | 2 |
| Angular | `AngularArticles` (54) | `AngularSections` (61) | 2 |
| SvelteKit | `SvelteKitArticles` (337) | `SvelteKitSections` (338) | 2 |
| Nuxt | `NuxtArticles` (51) | `NuxtSections` (58) | watch |
| Eleventy | `EleventyArticles` (52) | `EleventySedtions` (59) ⚠️ misspelled ref name | watch |
| Gatsby | `GatsbyArticles` (50) | `GatsbySections` (57) | 3 (archived) |
| Management SDK | `ManagementSDK-Articles` (354) | `ManagementSDK-Sections` (357) | consolidating |

> **Always re-discover first.** New frameworks get added and IDs change. Start every audit with `get_containers({ instanceGuid, take: 250 })` and rebuild this list from every container whose `categoryReferenceName === "SDKs-Frameworks"` and name ends in `Articles`. Don't trust the table above — regenerate it.

## Procedure

### 1. Discover
- `get_containers({ instanceGuid: "67bc73e6-u", take: 250 })`. Collect all `*Articles` containers in `SDKs-Frameworks`. **Ignore the container-level `lastModifiedDate`** — it's usually a bulk schema touch (identical timestamps across many containers), not editorial activity.

### 2. Inventory each framework
For each `*Articles` container: `get_content_items({ referenceName, locale: "en-us", take: 250, fields: ["Title","Slug"] })`.
- **Always pass `take: 250`** (default is 50 — has silently dropped articles before). Paginate with `skip` if `totalCount > 250`.
- Record per article: `Title`, `Slug`, `state` (Published / Staging / Unpublished), `createdDate`, `lastModified`.
- **Freshness rule:** treat any `lastModified` on **2025-12-17 or 2025-12-18** (or any timestamp shared to the millisecond across many articles) as a **bulk touch — not a real edit**. Use `createdDate` and non-bulk `lastModified` values for staleness.

### 3. Body check (empty / stub detection)
Staging counts are not enough — articles can be titled shells. For any article that is **Staging** or that you're unsure about, `get_content_item({ contentIDs: [...] })` (batch up to 50) and inspect the body:
- **Empty** = no `Content` field, or `Content` is `{"blocks":[]}`, **and** no `MarkdownContent`.
- **Stub** = fewer than ~4 content blocks / under ~400 chars of real text, or ends on a trailing empty header.
- Also flag `Description` values that are placeholders (`"Test"`, empty, `"..."`).

### 4. Nav-vs-content consistency
- `get_content_items({ referenceName: "header", locale: "en-us" })` → note the `PrimaryDropdownLinks` nested container (currently `Header_Link`).
- `get_content_items({ referenceName: "Header_Link", locale: "en-us", take: 250 })`. Parse the `Link` HTML `href` from each item.
- Cross-check:
  - **Ghost nav entry** — dropdown links to a framework whose section has **0 published, non-empty** articles (e.g. SvelteKit historically).
  - **Missing from nav** — a framework with published articles that has no dropdown entry (e.g. Management SDK, Blazor).
  - **Internal `~/slug` links** should resolve to a real framework path; **external GitHub-only** links (Python, PHP, Web Studio SDK) are expected — note them but don't flag.

### 5. Dead-product / stale-reference scan
For each framework (prioritize Tier 3 / watch-list and anything not touched since a real edit > 12 months ago), spot-check article bodies (`get_content_item`) for references to sunset tooling:
- Known dead: **Gatsby Cloud**, **Google Optimize** (sunset 2023), Netlify "Large Media", legacy `getStaticProps`-only guidance presented as current, `@agility/next` v1 patterns.
- Flag any framework doc still described around a superseded major (see step 6).

### 6. Framework-version drift
For each **active** framework (Tiers 1–2), `WebSearch` the current stable major (e.g. "Next.js latest version", "Nuxt latest", "Astro latest", "Angular latest", ".NET latest LTS", "SvelteKit / Svelte latest"). Compare against what the docs describe. Flag when the docs are a major version behind (e.g. docs assume Nuxt 2 while Nuxt 4 is current). Record current-vs-documented in the report.

### 7. Staleness thresholds
- **Tier 1 (flagship):** flag any article with no real edit in **> 9 months**.
- **Tier 2 (active):** **> 12 months**.
- **Watch-list / Tier 3:** report age but don't flag as failing (they're already policy-tagged).

## Output — the audit report

Emit Markdown ready to paste into [content-refresh-plan-2026.md §3](../../../docs/content-refresh-plan-2026.md). Structure:

```markdown
## Framework docs audit — <YYYY-MM-DD>

### Status table
| Framework | Articles | Real vintage | Published / Staging | In nav? | Empty/stub | Flags |
|---|---|---|---|---|---|---|
| ... one row per framework ... |

### Drift flags (action items)
- **Staging backlog:** <framework> — N articles staged since <date>, never published.
- **Empty/stub:** <framework> — "<title>" (contentID) has no body.
- **Ghost nav:** <framework> in dropdown but 0 live non-empty articles.
- **Missing from nav:** <framework> has published articles but no dropdown entry.
- **Dead reference:** <framework>/"<title>" references <sunset product>.
- **Version drift:** <framework> docs describe v<X>, current is v<Y>.
- **Stale:** <framework>/"<title>" — last real edit <date> (> threshold).

### Clean
- Frameworks with no flags: <list>.
```

Always date the report and note the total article count audited. Rank flags by tier (Tier 1 issues first).

## Guardrails

- **Read-only.** Never `save_content_items`, and remember the MCP cannot publish/unpublish/delete regardless — never imply otherwise. If the audit finds work to do, point to the plan and the authoring skill; don't do it here unless separately asked.
- **Don't trust the bulk-touch timestamp** (see steps 2/3) — it's the single biggest source of false "recently updated" readings.
- **`take: 250` on every list call**, paginate beyond that.
- **Reference-name case** is lowercased on read — don't try to verify container-name case from read output.
- Keep the framework table and the [plan's §2 tiers](../../../docs/content-refresh-plan-2026.md) in sync — if the audit discovers a new framework container, add it to both.
