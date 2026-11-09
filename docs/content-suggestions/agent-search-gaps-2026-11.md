# Agent search gaps, week of 2026-11-02

Source: PostHog alert "Docs: agents asked questions the docs probably don't answer (weekly)" (project 33241), which fired on 2026-11-09 with 16 low-confidence searches through the docs MCP (`search_docs`, best Azure semantic-ranker score below 2.3 of 4). The questions are in the insight [Docs MCP: low-confidence searches (questions)](https://us.posthog.com/project/33241/insights/zRbf28AZ).

Each query was re-run against the live docs on 2026-11-09 to see whether it is still a gap.

## Still open

| Query | Best score now | Best current page | Decision | Status |
|---|---|---|---|---|
| migrate from Kentico | 1.55 | Migrate from Contentful (wrong source) | Write **Migrate from Kentico to Agility** in Developers > Migrating to Agility, same shape as the Drupal and Sitecore guides. Covers Xperience by Kentico and Kentico Xperience 13 separately, with every Kentico claim checked against Kentico's own docs and a "last verified" date. Demand is low (one real agent search in 180 days), but Joel decided to write it on 2026-11-09. | In progress |
| component model thumbnail image in picker | none relevant (best 2.44 is an unrelated Next.js image page) | none | Document component thumbnails (shipped to prod 2026-11-03): where an admin sets the thumbnail on a component model, what editors see in the component picker, recommended image size. Joel: do this before the feature's launch. | Before launch |

## Borderline (scores near 2.3)

| Query | Best score then | Page | Status |
|---|---|---|---|
| professional services migration assistance | 2.29 | .NET Migration Guide (wrong topic) | **Published 2026-11-09:** "Getting help with your migration" on [Migrating to Agility](https://agilitycms.com/docs/developers/migrating-to-agility) (1753): implementation partner directory, contact page, /docs/support, support@agilitycms.com. No pricing. The same publish replaced the six-phases table with a dual-theme diagram. |
| members-only gated content authenticated users | 2.27 | Vibe Coding Playbooks; Reference Architecture: Member Portal (2.06) | **In Staging 2026-11-09:** 1782 retitled "Reference Architecture: Member Portals, Intranets and Gated Content". Its description and opening paragraph now say members-only, gated content and authenticated users. Slug unchanged. |

## Closed since the alert fired

These scored below 2.3 at search time and now score well, because of articles published 2026-11-02 to 11-05:

| Query | Score now | Page |
|---|---|---|
| migrate from Drupal | 3.00 | Migrate from Drupal to Agility |
| notifications bell in the Content Manager | 3.15 | Manage your notifications |
| media file name allowed characters upload | 2.75 | Replacing Files and Naming Assets |
| overwrite file in media library | 2.51 | Replacing Files and Naming Assets |
| rich text links tilde ~/ resolve URL | 2.82 | Field Types and What the APIs Return |
| scrape website crawl content import | 2.53 | Migrating Content into Agility with an AI Agent |

## Not a docs gap

- **security key changes when website name renamed**: customers can't rename instances yet (org-management roadmap), so there is nothing to document.
- **`Yto`, `T`, `eZQNf3FT2`, `yZthxFAg7r`, `KN94OJmG1j`**: an automated probe on 2026-11-07 at 07:10 UTC (10 MCP calls in 3 s). The alert insight and the questions table now exclude a query that is a single word of 1–3 characters, or a single word that mixes upper case, lower case and digits. Every server-side event is flagged `$virt_is_bot` (no user agent), so that flag can't be used to filter.
