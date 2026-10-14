---
name: algolia-search-analytics
description: What people search for on the docs, which searches return nothing (content gaps), and click-through on results. Search analytics reporting moved to the internal agility-internal-ops repo on 2026-10-14; use this to point the user there.
---

# Algolia search analytics: moved

Search analytics reporting moved on 2026-10-14 to the internal `agility-internal-ops` repo, as part
of its product reporting hub (`product-reporting/`). Run `/algolia-search-analytics` there. It now
covers both the docs index and the agilitycms.com index, and keeps weekly history beyond Algolia's
analytics window.

This repo still owns the **instrumentation**: the indexer, `clickAnalytics` in the search modal,
[lib/analytics/algoliaInsights.ts](../../../lib/analytics/algoliaInsights.ts), and the PostHog search
and agent events in [lib/analytics/](../../../lib/analytics/). If you change an event name or property
there, tell the hub so its saved queries keep working.

The output still feeds [docs/content-refresh-plan-2026.md](../../../docs/content-refresh-plan-2026.md):
no-result searches are content gaps.
