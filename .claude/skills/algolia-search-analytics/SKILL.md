---
name: algolia-search-analytics
description: Query the Algolia Search Analytics API for the docs site index (doc_site) to see what people search for, where searches return nothing (content gaps), and — once click events flow — what they click and how well results rank. Use when asked what users are searching, to find missing/under-served topics, to gauge demand for a framework/SDK, or to feed the content refresh plan. Read-only reporting.
---

# Algolia Search Analytics (docs site)

Reads the **Algolia Analytics REST API** for the `doc_site` index to answer "what are people searching for and interacting with?" It's a **read-only** reporting skill — it never writes to the index or the CMS. Its output feeds [docs/content-refresh-plan-2026.md](../../../docs/content-refresh-plan-2026.md): **no-result searches = content gaps**, **frequent searches for undocumented frameworks = demand** (Phase 5), **low click-through = title/ranking problems**.

## What Algolia records vs. what we added

- **Searches** (queries, counts, no-results) are logged **server-side by Algolia automatically** — available now, retroactively, with no client changes.
- **Clicks / click-through rate / click position / conversions** require **Insights click events**, which the docs search UI started sending after 2026-07 ([lib/analytics/algoliaInsights.ts](../../../lib/analytics/algoliaInsights.ts), `clickAnalytics:true` in [SearchModal.tsx](../../../components/common/SearchModal.tsx)). These metrics are **empty for dates before instrumentation** and build up going forward.
- PostHog also captures `docs_search`, `docs_search_result_click`, and `docs_quicklink_click` events — use the PostHog MCP for session/funnel context; use **this** skill for the Algolia-native search picture.

## Credentials (read from .env.local — never print them)

The Analytics API needs a key with the **`analytics` ACL**. The public search key (`NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`) does **not** have it — do not use it here.

```bash
# Load server-side creds without echoing values
set -a; source .env.local; set +a
APP_ID="${ALGOLIA_APP_ID:?missing}"
# Prefer a dedicated analytics key; fall back to the admin key (has all ACLs)
ANALYTICS_KEY="${ALGOLIA_ANALYTICS_API_KEY:-$ALGOLIA_ADMIN_API_KEY}"
INDEX="doc_site"
BASE="https://analytics.algolia.com"   # if this 4xx's on region, try analytics.us.algolia.com / analytics.de.algolia.com
```

All requests send `-H "X-Algolia-Application-Id: $APP_ID" -H "X-Algolia-API-Key: $ANALYTICS_KEY"`.

## Core endpoints (Analytics API v2)

Date range is optional (`startDate`/`endDate`, `YYYY-MM-DD`); default is roughly the last week, max window depends on plan (commonly 90 days). `index` is always required.

| Question | Endpoint |
|---|---|
| Top searches (+ counts) | `GET /2/searches?index=$INDEX&limit=50` |
| **Searches with no results** (content gaps) | `GET /2/searches/noResults?index=$INDEX&limit=50` |
| No-result rate | `GET /2/searches/noResultRate?index=$INDEX` |
| Total search count / trend | `GET /2/searches/count?index=$INDEX` |
| Top results for a query | `GET /2/hits?index=$INDEX&search=<query>` |
| Top filters used | `GET /2/filters?index=$INDEX` |
| Click-through rate* | `GET /2/clicks/clickThroughRate?index=$INDEX` |
| Average click position* | `GET /2/clicks/averageClickPosition?index=$INDEX` |
| Conversion rate* | `GET /2/conversions/conversionRate?index=$INDEX` |
| Top countries | `GET /2/countries?index=$INDEX` |
| Unique users | `GET /2/users/count?index=$INDEX` |

\* Populated only from the instrumentation date forward (needs Insights events).

### Example

```bash
# Top 50 searches over the last 90 days
curl -s "$BASE/2/searches?index=$INDEX&limit=50&startDate=$(date -v-90d +%F)&endDate=$(date +%F)" \
  -H "X-Algolia-Application-Id: $APP_ID" -H "X-Algolia-API-Key: $ANALYTICS_KEY" | jq '.searches[] | {search, count, nbHits}'

# What people search that returns nothing — the content-gap list
curl -s "$BASE/2/searches/noResults?index=$INDEX&limit=50" \
  -H "X-Algolia-Application-Id: $APP_ID" -H "X-Algolia-API-Key: $ANALYTICS_KEY" | jq '.searches[] | {search, count}'
```

## Procedure

1. Load creds (above). Pick a date range — default last 90 days; call it out in the report.
2. Pull, at minimum: **top searches**, **no-result searches**, **no-result rate**, and total count. Add CTR / avg click position / conversion when the range is after instrumentation.
3. **Cross-reference against the docs.** For high-volume or no-result queries, check whether an article exists (search terms like `blazor`, `remix`, `vue`, `graphql`, framework names → does a section/article cover it?). Use the `audit-framework-docs` skill's container map or the CMS MCP to confirm.
4. Emit a report (below). Rank by impact: high-count no-result queries first.

## Output — report shape

```markdown
## Algolia search analytics — doc_site — <start> to <end>

- Total searches: N · No-result rate: X% · Unique users: N

### Top searches
| Query | Searches | Avg hits | Covered in docs? |

### Content gaps (no results, by volume)
| Query | Searches | Suggested action |
- e.g. "blazor" → 40 searches, 0 results → Phase 5 candidate / expand .NET

### Engagement (if instrumented for the range)
- Click-through rate, avg click position, top clicked results, low-CTR queries.

### Feeds the plan
- New/expanded framework candidates (demand-driven): ...
- Ranking/title fixes (high search, low CTR): ...
```

## Guardrails

- **Read-only.** Analytics endpoints only; never write to the index.
- **Never echo or commit keys.** Source them; keep the analytics/admin key server-side (it must never appear in client code or a `NEXT_PUBLIC_` var).
- If click/CTR/conversion come back empty, that's expected for pre-instrumentation dates — say so rather than reporting "no engagement."
- On a region error from the base host, retry against `analytics.us.algolia.com` (this app is on US cloud per PostHog project context) or `analytics.de.algolia.com`.
