# Docs execution plan, Q4 2026

Joel approved every recommendation in [content-suggestions/net-new-articles-2026.md](content-suggestions/net-new-articles-2026.md) and [content-suggestions/feature-coverage-gaps-2026.md](content-suggestions/feature-coverage-gaps-2026.md) on 2026-10-03. This file turns them into tracked work. The strategy and the reasoning live in [docs-modernization-plan-2026.md](docs-modernization-plan-2026.md); this is the work breakdown.

**Rules for every item** (from the modernization plan, §9 decision 4):

- Everything is saved to **Staging**. A named person reviews and publishes. Nothing goes live from this plan without that.
- A fact goes into an article only if it can be checked against a source: the developer changelog, the OpenAPI snapshots in `lib/api-specs/snapshots/`, a live call to this docs instance's own Fetch API, a published package, or an existing article that is itself verified. Anything else goes into the item's `NoteInternal` as a question, and the article either leaves it out or says less.
- Security, AI data handling, limits and pricing statements are effectively contractual (net-new §4). Those articles are drafted as **review drafts**: the facts we can verify, plus a visible list of questions for product, security or legal. They are not ready to publish until those questions are answered.
- One agent owns an article at a time. Tracks below list the articles they own, so parallel work never edits the same item.
- No em dashes in new text.

**Changed by the 2026-10-03 framework decision:** gap action 3 ("Web Studio guides for Nuxt, Astro, SvelteKit, Angular") is replaced by one framework-agnostic Web Studio setup guide, a .NET guide and a troubleshooting page, because those four frameworks are now archived (Nuxt is "outdated").

## Wave 1: fix what the product changed, and the reference pages developers keep open

Highest harm first. All facts come from the changelog, the API specs or the live API.

| Track | Work | Source items | Owns | Status |
|---|---|---|---|---|
| **W1-A Publishing** | Publishing now includes nested linked content by default, and the "Publish this item only" opt-out, in every publishing, Web Studio and bulk-publish article. Rewrite batch publishing as one current article (multi-select, progress, approvals, scheduling). New Batch API lifecycle page. Fix "slide-out" wording in scheduling. | Gap 1, 5; flags 1-3 | Publishing, scheduling, batch, workflow articles | Staged 2026-10-03: new 1738 Batch API; 203 rewritten; 58, 52, 892, 130, 1343 edited (49, 227 already correct). Open: does the opt-out appear in Web Studio and reports; how far a cascade publish goes; **do MCP `publish_content`/`publish_page` cascade?** Retire candidate: 232. JS SDK article 1618 still shows .NET 1.x names (W5-D) |
| **W1-B Assets and images** | Where Used and the in-use delete confirmation in the asset articles (1697 already staged). Image transformation reference: parameters, formats (AVIF, WebP), focal point, limits we can verify, GIF and SVG rules. Correct the SVG statement in image-best-practices: `?format=auto` alone passes an SVG through, `?w=` rasterizes it (measured 2026-10-03). | Gap 2, 6; flag 5 | Asset and image articles | Staged 2026-10-03: new 1739 image transformation reference (live CDN measurements); 1697, 223, 612, 225, 629, 1400, 920 edited. Found: the CDN applies only `w`, `h`, `c`, `q`, `format` (629 listed 26 Fastly params); no-`c` default crops. 8 product questions incl. a possible `c=1`/`c=2` distortion bug |
| **W1-C Developer reference** | Fetch API status codes and caching (400 filter errors, 408 cached 30 s, 429, empty lists). Field type reference showing what every field type returns in Fetch and GraphQL, including the Markdown field, from live calls. Content Sync concept guide (Sync vs Fetch vs GraphQL, token lifecycle, webhook-driven incremental sync). | Gap 9, 11, 14 | New reference articles; content-fetch-api | Staged 2026-10-03: 1742 status codes and caching, 1743 field types and API output, 1744 Content Sync explained. **Needs a keyed re-check before publishing** (no Fetch key in the environment). 257 links prepared, not saved (90k-character EditorJS body; manual edit). For W5-D: 265 says GraphQL has no pages (changelog says it does); 261 says "max 500" (spec: default 500) |
| **W1-D Webhooks** | Webhook event and payload reference: per-event payloads, headers, timeout, retryable status codes, delivery history, secret rotation, dedupe. | Gap 8 | Webhook articles | Staged 2026-10-03: new 1737 reference; 437, 1634, 1334, 1617, 1706 edited. 13 open questions (timeout, egress IPs, workflow payloads) in NoteInternal |
| **W1-E Localization** | Whole-locale, page, selection and single-field copy; multi-locale copy and translate; Translation and Initialize APIs; a strategy chooser (field vs page vs instance localization). | Gap 10 | Localization articles | Staged 2026-10-03: new 1746 (Initialize/Translate API), 1747 (strategy chooser); 1412, 1625, 645, 1403, 959, 132, 529 edited. Publish all together; 1746/1747 link 1725. Open: 1412's "private beta" warning vs "Released May 2026"; overwrite behaviour; no JS SDK methods yet |
| **W1-F Editor productivity and UI prose** | "Work faster in Agility" (Favorites, next/previous item, page-picker search, sync status, report export, Access Report). Prose (no screenshots) for the 2026 navigation, rail panel, side panels and modals, starting with navigation, plenum-ui and redirect testing. | Gap 4, 13 | Navigation, UI tour, reports, redirect-testing articles | Staged 2026-10-03: new 1745 Work Faster; 1339, 778, 201 edited. ~20 articles with pre-2026 nav or slide-out wording routed to a follow-up sweep (W1-F2). 778 is still mostly the 2022 launch post: candidate for a fresh UI tour. 778's SEO description still says "Beta 1" |
| **W1-G Web Studio** | Framework-agnostic Web Studio setup (script + `data-agility-*` attributes + preview route), a .NET guide, and a troubleshooting page (CSP check, fields that can't update live). | Gap 3 (revised) | Web Studio articles outside /nextjs | Staged 2026-10-03: new 1748 setup with any framework, 1749 troubleshooting; 1059, 1066, 1593 link them; LinkCards 1751/1752 on /web-studio. Sourced from the SDK 1.0.26 source. Found: the SDK reads the GUID from `<body>` (its README says root); this site never set it (fixed in code); the .NET MVC starter's Web Studio wiring is unfinished, Blazor has none |
| **W1-H Roles** | Roles and permissions matrix (role by action, teams, item-level permissions). Role design recipes for agencies, regional teams and freelancers (#33). Flags the "nine vs ten roles" mismatch for marketing. | Gap 12; #33 | user-permissions and role articles | Staged 2026-10-03: new 1740 matrix, 1741 recipes; 421, 776, 769, 439 link them. 16 questions (Q1 to Q10, R1 to R7), incl. which roles the picker offers (docs name 11, marketing says 9) |

## Wave 2: evaluator, architect and migration content

Writable from existing docs and product knowledge in the repo. New sections where needed (confirm container names with `get_containers`).

| Track | Articles | Section |
|---|---|---|
| **W2-A Evaluate** | #3 What your team builds vs what Agility provides; #2 How Agility works (architecture tour); #1 Is Agility right for your project (review draft: product marketing signs off on fit criteria); #4 Capability checklist and questions to ask any vendor; #5 Two-week proof of concept; #8 Headless, hybrid or traditional; #9 Data portability and exit; #7 Replatforming business case; #40 Evaluate Agility with an AI agent in 30 minutes | New "Evaluating Agility" section: **staged 2026-10-03** as section 1754 with 1757 (landing), 1758, 1760, 1761 (review draft), 1762, 1763, 1764, 1765, 1768, 1769. Publish the section with all 10; they link 1721, 1727, 1728, 1730, 1731, 1735, 1736, 1743, 1744 |
| **W2-B Architecture** | #10 Reference architectures hub + 4 to 5 pages (marketing site, multi-brand, commerce, intranet/member, multi-channel); #11 Choose your tenancy model; #22 Handle rate limits and outages; #23 Content Security Policy and network allowlist (hosts verified from live responses) | Developers / architecture: **staged 2026-10-03** as section 1770 "Architecture": 1774 hub, 1775 marketing site, 1776 multi-brand, 1781 commerce, 1782 member portal (review draft), 1783 multi-channel, 1784 tenancy, 1786 rate limits and outages, 1787 CSP and allowlist (review draft; hosts verified from SDK source and TLS certs) |
| **W2-C Modeling** | #12 Content modeling anti-patterns; #13 Nest, link or share; #14 Taxonomy that scales; #15 Map your design system to component models; #16 Structured content explained; #17 Beyond the website; #39 Make your content model agent-friendly | Content modeling: **staged 2026-10-03** in Content Architecture (220): 1773 anti-patterns, 1283 rewritten as Nest, link or share, 1777 taxonomy, 1778 design system, 1779 structured content, 1780 beyond the website, 1785 agent-friendly models. Corrected diagram v2 (nested items are orphaned, not deleted, with the parent) |
| **W2-D Migration** | Migration hub; #18 Migrate from WordPress; #19 Migrate from Contentful, from Sitecore (export APIs only, no judgments, "last verified" date); #20 Cutover runbook; #21 Keep your rankings through a migration; links 1728 (migrating with an AI agent) | New "Migrating to Agility" section: **staged 2026-10-03** as section 1750 with 1753 (hub), 1755 WordPress, 1756 Contentful, 1759 Sitecore, 1766 cutover runbook, 1767 search rankings. Needs 1728, 1738, 1742, 1743, 1608 live. Reviewer decides whether 1728 and 1458 move into it |

## Wave 3: review drafts that need product, security or legal answers

Drafted with every verifiable fact and an explicit question list. Not publishable until answered.

| Track | Articles | Blocking questions go to |
|---|---|---|
| **W3-A Trust** (staged 2026-10-03 as review drafts: section 1772 "Security and Compliance" with 1789, 1792, 1795, 1797, 1799; 38 blocking questions) | #30 Shared responsibility model; #31 Security review pack; #35 What happens to your data when you use AI (plan §9 decision 7); #32 Admin go-live checklist; #34 User lifecycle at scale | Security, legal, product |
| **W3-B Limits** | #6 Understand your plan's limits and usage, reconciling "unlimited API requests" with the 10 uncached requests per second limit; numbers only from billing | Product, billing |
| **W3-C Marketing claims** | One questions document for product marketing: Custom API Domain, GDPR, 30-day backups, Content Analytics, nine vs ten roles, unlimited requests, CDN naming on /security, ai12z and Conscia (document or delist), Shopify beyond the archived starter | Product marketing |
| **W3-D Agent skills** | #36 Install Agility skills for your coding agent: confirm where skills are published before documenting an install command (never a package name that doesn't exist) | Product |

## Wave 4: content operations and AI practice

| Track | Articles |
|---|---|
| **W4-A Content ops** (staged 2026-10-03: section 1771 with 1788, 1790, 1791, 1793, 1794) | #25 Content operations playbook; #26 Writing for structured content; #27 Accessible content checklist; #28 Editorial calendar with scheduling and approvals; #29 Measure what you publish |
| **W4-B AI practice** (staged 2026-10-03 in section 1720: 1796, 1798) | #37 Writing good requests to an AI assistant in Agility; #38 When to use AI and when not to |
| **W4-C Developer quality** | #24 Test your Agility integration in CI; one page per CLI command (gap: Storyblok has 31) |

## Wave 5: site features and sweeps (code in this repo)

| Track | Work |
|---|---|
| **W5-A Glossary** | Per-term URLs (`/docs/glossary/<term>`) generated from a glossary content list, with `DefinedTerm` structured data. Pattern 13. |
| **W5-B Agent plumbing** (done 2026-10-03: every `.md` twin ends with "Related pages" from its section, linking .md twins, plus the llms.txt index) | "Related pages for agents" in each `.md` twin and `llms.txt` sections per audience. Pattern 11. Measured by `docs_agent_request`. |
| **W5-C Terminology sweep** | "Page Template" to "Page Model" and "Module" to "Component" in the 31 article bodies, run alone after Waves 1 to 4 so it never collides with another track. |
| **W5-D Drift checks** | Run the api-spec-drift skill against everything Waves 1 to 4 touched. |

## Order and capacity

Waves run in order, tracks within a wave run in parallel. Each track reports a table of content IDs, what changed, and what it could not verify; those reports update the Status column here and the Progress table in the modernization plan. Publishing stays with Joel or a named reviewer, in this order: Wave 1 first (it corrects live behavior), then sections together with their articles.

## Log

| Date | Entry |
|---|---|
| 2026-10-03 | Plan written. Wave 1 started. |
| 2026-10-03 | Follow-ups: 1747 links 1784 and its example host fixed (regional `api*.aglty.io`, per content-fetch 2.0.11); 1780 and 1783 cross-linked; diagram v2 (mediaID 2502) swapped into 1283, v1 untouched. Waves 1 and 2 complete. |
| 2026-10-03 | W1-F2 sweep staged: 130, 223, 612, 284, 583, 581, 582, 437, 769, 48, 59, 57, 221, 46, 1627, 450 now use neutral 2026 UI wording. Screenshot backlog logged in screenshots-needed.md. 583's intro wrongly says it builds a searchlistbox (copied from 582). Publish 1745 before 450. |
| 2026-10-03 | Framework decision applied: 1736 "Why We Recommend Next.js and .NET" staged; 250, 114, 445, 280, 446, 1346, 1364 now recommend Next.js or .NET and link 1736 and the Vibe Coding section. **Publish chain:** section 1729 and 1730 to 1735, then 1736, then those seven. Leftovers for W5-C: 446 still links the archived Next.js AWS guides; 445's Next.js Commerce section describes the archived starter; 1348 and 257 (ClassicContent) still show Gatsby install lines. |
