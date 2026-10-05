# Open questions for product, security and marketing (October 2026)

Every question the Q4 docs work could not answer from a verifiable source, in one place, grouped by who can answer it. Each one is also recorded in the `NoteInternal` of the article it blocks, so an answer can be applied there directly. Articles stay in Staging until their blocking questions are answered (see [docs-execution-plan-2026-q4.md](../docs-execution-plan-2026-q4.md)).

Priority: **P1** blocks publishing or risks a wrong statement in live docs; **P2** improves accuracy; **P3** nice to have.

## Product: platform behavior

| # | Pri | Question | Blocks |
|---|---|---|---|
| 1 | P1 | Do the MCP `publish_content` and `publish_page` tools publish the item only, or nested linked content too? The plain publish API is item-only; `publish-cascade` includes nested content. The AI articles describe autonomous publishing, so this decides what an agent can push live. | 1720–1728, 1738 |
| 2 | P1 | The live Management API spec no longer lists `publish-cascade` and `cascade-items` (items and pages). Retired, or hidden from the public spec? The .NET SDK 2.0 still has methods for them. | 1738, API reference (4 pages) |
| 3 | P1 | Where does the "Publish this item only" opt-out appear: Publish prompt only, or also Web Studio, multi-select page publish, Ready to Publish report? | 203, 58, 892, 130, 1343 |
| 4 | P1 | If nested content is in a list that requires approval, does publishing the parent take it live unapproved, or skip it? How deep does a Content Manager cascade go? | 1738, 130 |
| 5 | P2 | Does "Add to existing batch" still exist after the 2026 navigation? Is the Batches page still under Reports? | 203 |
| 6 | P2 | Copying to a locale where the item exists: overwrite, new version, or skip? Do copies land in Staging? Where is background progress shown? | 1412, 1746 |
| 7 | P2 | Is bulk copy to locales still "Private beta" (1412 says so) or released (changelog: May 2026)? | 1412 |
| 8 | P2 | Which engine does the Translation API use, and what happens without the DeepL app? Item limit per call? | 1746 |
| 9 | P2 | Is there any locale fallback in Fetch or GraphQL? Does an uninitialized page appear in that locale's sitemap? | 1747 |
| 10 | P2 | Webhooks: request timeout (437 and 1634 say 30 s, no source); is `webhook-id` sent on unsigned deliveries; workflow event payload shape; egress IPs. | 1737, 437, 1634 |
| 11 | P2 | Image CDN: is the 5-parameter allowlist (`w`, `h`, `c`, `q`, `format`) intended and the same on every plan? Official size limits? `c=1`/`c=2` size from stored dimensions, which distorted one image: bug? | 1739, 629 |
| 12 | P2 | Fetch rate limit: per key, instance or IP? Applies to GraphQL and preview? `Retry-After` on 429? | 1742, W2-B |
| 12b | P2 | Management API: is there a request-rate limit (per token or instance), and a recommended batch size for saves? Can SEO fields on dynamic-page items be written through the API? Is 410 Gone supported for redirections? | 1753, 1766, 1767 |
| 12c | P2 | Modeling: is deleting a parent still orphaning nested items (2024 changelog)? Is required/length/regex validation enforced on API and MCP saves? Does renaming a field change its API name? Native tagging (`allowTagging` in the spec)? `[contains]` filter semantics on comma-separated IDs? GraphQL pages/sitemaps support (changelog says yes, article 265 says no)? | 1773, 1777, 1283, 1785, 265 |
| 12d | P2 | Networking: do non-US instances serve assets from cdn.aglty.io? A supported list of hosts editors' browsers need? Published IP ranges for API or webhook egress? Can media assets be private without the Secure Files apps? Are sitemaps an add-on and is a subscription per instance (licensing wording in 1776, 1784)? | 1782, 1784, 1787 |
| 12e | P2 | `@agility/content-fetch` 2.0.11 returns `undefined` (logs, never throws, never retries) on non-2xx and network errors, so an ISR refresh can cache empty content. Intended? An opt-in throw would help. | 1786, SDK |
| 13 | P2 | Is there a native Markdown field type, or is Markdown a Text field? | 1743 |
| 14 | P2 | Web Studio: is `app.agilitycms.com` the only framing origin in every region? Which field types can't update live? Will the .NET starters get full Web Studio wiring? | 1748, 1749 |
| 15 | P3 | Where do Favorites, next/previous, sync status and report export live in the 2026 UI? Export format? | 1745, 1339 |
| 16 | P3 | Is the classic UI still available in 2026 (778 says legacy custom fields need it)? | 778 |
| 17 | P3 | Does a new trial instance include a sitemap and API keys? Is MCP on every plan? | 1769 |
| 18 | P3 | `/oauth/getfetchkey` now says "requires a caller who is a member": confirm, so CLAUDE.md's "unauthenticated" warning can be retired. | repo |
| 19 | P3 | OAuth refresh: should docs show the refresh token in the body (as SDK 2.0 sends it) once the spec documents it? | 1608 |

## Product: roles and permissions

| # | Pri | Question | Blocks |
|---|---|---|---|
| 20 | P1 | Which roles does the role picker actually offer? Docs name 11 (prose: None…Admins; chart adds Report Viewer); marketing says nine. | 1740, marketing |
| 21 | P2 | Can a Publisher approve? Can a Manager delete content, view reports, change user access? Which roles can see or regenerate API keys? | 1740 |
| 22 | P2 | Do multiple roles on one user add up? Any locale-scoped permission? Does an automation/AI user take a paid seat? | 1740, 1741 |

## Security and legal (blocking for Wave 3 review drafts)

Filled in from the W3-A report when it lands; the existing decision 7 questions from the modernization plan:

| # | Pri | Question | Blocks |
|---|---|---|---|
| 23 | P1 | How does a user revoke an MCP OAuth grant? Token and log retention for the MCP server? | 1727, #35 |
| 24 | P1 | Do enforced SSO/MFA apply to MCP sign-in? Does version history mark MCP-made changes? | 1727, #35 |
| 25a | P1 | Certifications: /security says SOC 2 "as of December 1, 2021" and PCI compliant; 1450 says a SOC 2 period beginning Aug 31, 2025; 633 says "PCI DSS compliant". Is trust.agilitycms.com the canonical list, and what needs an NDA? Is there a published subprocessor list and a DPA? | 1792, 1450, 633 |
| 25b | P1 | MCP: where is it hosted and does traffic cross regions? Does it call any LLM or third party itself? Is content used for training? Can an admin disable MCP or allowlist clients? Are Knowledgebase MCP queries logged? | 1795 |
| 25c | P1 | Editor AI features (2024-12-05 trial): do they exist today, which provider, what data and retention, admin off switch? DeepL app: whose account, retention, region? | 1795 |
| 25d | P2 | SCIM or JIT provisioning on any plan? Org-level user suspension? Do sessions, OAuth tokens and MCP connections lose access immediately when a user is removed? Can an admin see or revoke another user's PATs? | 1799 |
| 25e | P2 | Are login-type restrictions and MFA enforcement self-serve (MFA doc still promises a "Q1 2021" Security Centre)? How is a point-in-time restore requested? IP allowlisting, session timeouts, fixed webhook egress IPs? | 1797 |
| 25f | P2 | Marketplace apps: who is responsible for their security, and are they reviewed before listing? | 1789 |
| 25 | P1 | Data retention after a subscription ends; assisted export; can users, roles, workflow settings and audit logs be exported? | 1765 |

## Product: limits and agent skills

| # | Pri | Question | Blocks |
|---|---|---|---|
| 33 | P1 | Exact sentence reconciling "Unlimited API requests" (pricing) with the documented 10 uncached requests/s. Do CDN-cached responses count toward bandwidth? Preview traffic? | 1806 |
| 34 | P1 | What happens when an instance exceeds a plan limit: overage charge, throttling, notification, hard stop? Do any technical limits differ by plan? | 1806 |
| 35 | P1 | Will Agility publish an official skills package, through which channel (npm, GitHub repo for `npx skills add`, `.well-known/skills`, MCP)? **Reserve `@agility/skills`, `@agility/agent-skills` and a public `agility/skills` repo now**: all free today and squattable. | 1808 |
| 36 | P3 | Are the public-repo skills (e.g. `agility/nextjs-demo-site-2026` create-blog-post) meant for customers? Is docs.agilitycms.com the long-term host for the Knowledgebase MCP? | 1808 |

## CLI (`@agility/cli` 1.1.0)

| # | Pri | Question | Blocks |
|---|---|---|---|
| 37 | P1 | `workflows` with no or an unknown operation **publishes**. Intended? It also acts only on the first locale passed, and its error says `--locale` (the option is `--locales`). | 1804 |
| 38 | P1 | Unknown flags are silently ignored, so a mistyped `--preflight` runs a real sync. Reject unknown options? | 1802 |
| 39 | P2 | `pull`, `workflows` and `login` exit 0 when sign-in or validation fails (push/sync were fixed). Intended? | 1800 |
| 40 | P2 | Only `AGILITY_GUID`, `AGILITY_TARGET_GUID`, `AGILITY_LOCALES`, `AGILITY_TOKEN` from `.env` take effect; other `AGILITY_*` keys are overwritten by defaults. Bug or doc issue? README sync-token paths and `--contentIDs` placement are also wrong; `--help` mentions nonexistent `workflowOperation` and `genenv` commands. | 1800, 1276, 1399 |

## Product marketing

| # | Pri | Question | Blocks |
|---|---|---|---|
| 26 | P1 | Sign-off on fit and non-fit criteria in "Is Agility right for your project?" Is there a private or dedicated hosting option? | 1761 |
| 27 | P1 | Reconcile site claims with docs: Custom API Domain (no docs), GDPR (no admin docs), "30-day point-in-time backups" vs docs "on request", "Content Analytics" (no such feature in docs), "nine built-in roles" (see 20), "unlimited API requests" vs the documented uncached rate limit. | W3-C |
| 28 | P2 | /security says "Azure CDN and Stackpath CDN"; product pages and docs say Fastly. | marketing site |
| 29 | P2 | ai12z and Conscia are on the integrations page with no docs: document or delist? Shopify beyond the archived starter? | integrations |

## SDK and tooling owners

| # | Pri | Question | Blocks |
|---|---|---|---|
| 30 | P2 | JS Management SDK: `getBatch` retry throws on the first error and decrements `retryCount` twice; no Initialize/Translate methods yet; `getBatchTypes()` calls `batch/types`, absent from the spec. | 1738, 1746 |
| 31 | P2 | Web Studio SDK README: the GUID goes on `<body>` (README says root), `data-agility-previewbar` needs `="true"`, `data-agility-nested-listitem` is undocumented. | 1748 |
| 32 | P3 | .NET MVC starter: `data-agility-guid="INSERT_GUID_HERE"` placeholder, unfinished `data-agility-page`, preview cookie without `SameSite`. Blazor has no Web Studio wiring. | 1736, 1748 |
