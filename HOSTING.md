# HOSTING.md — deployment topology, portability contract, and vendor register

This site follows the **hosting portability principles** in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) §"Hosting portability principles": either site (marketing or docs) must be hostable on **Vercel, Netlify, or any combination** without code changes. This file is the operational record: the proxy contract, the cache strategy, every vendor-specific or dashboard-only setting, and the lock-in register.

## Current topology (2026-07)

| Site | Host | Repo |
|---|---|---|
| agilitycms.com (apex / marketing) | **Netlify** | Agility-Website-Nextjs (being rebuilt from scratch in a new repo/instance) |
| agilitycms.com/docs (this app) | **Vercel** | this repo — Next.js with `basePath: '/docs'` |

The apex proxies `/docs/*` to this app's Vercel deployment via a Netlify rewrite. **Located 2026-09-17** — it is *not* dashboard-only as this file previously said. It lives in the marketing repo (`Agility-Website-Nextjs`) at `public/_redirects`, lines 16–17:

```
/docs   https://agilitycms-documentation-site.vercel.app/docs 200
/docs/* https://agilitycms-documentation-site.vercel.app/docs/:splat 200
```

`200` makes these proxy rewrites rather than redirects. Netlify does store the proxied response (`cache-status: "Netlify Edge"; ... stored`), so the origin's cache headers are what govern — hence the strategy below. When the apex moves to the 2026 marketing repo, port these two lines; the docs-side contract is unchanged.

## The proxy contract

Whichever deployment serves the `agilitycms.com` apex MUST:

1. Reverse-proxy `/docs/*` (and `/docs` itself) to the docs deployment, preserving **path, query string, cookies, and request headers**. Cookie forwarding matters: signed-in detection reads the `.agilitycms.com` auth cookie server-side.
2. NOT cache responses beyond what the docs origin's `CDN-Cache-Control` header allows.
3. NOT rewrite or buffer response bodies (streaming responses must pass through).

Any host that can express this is a valid apex. Recipes:

**Netlify** (`netlify.toml` in the apex repo):
```toml
[[redirects]]
  from = "/docs/*"
  to = "https://<docs-deployment-domain>/docs/:splat"
  status = 200
  force = true
```

**Vercel** (`next.config` in the apex app):
```js
async rewrites() {
  return [{ source: '/docs/:path*', destination: 'https://<docs-deployment-domain>/docs/:path*' }]
}
```
(If both sites are ever on Vercel, prefer Vercel Microfrontends — but nothing in either codebase may *depend* on it.)

## Cache strategy (standard-first)

- **Pages (LIVE, set in [proxy.ts](proxy.ts) — not `next.config`):**
  - `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400` — the portable default, and what Vercel's own edge honours. Left short because Next's ISR plus `/api/revalidate` already invalidate Vercel precisely.
  - `Netlify-CDN-Cache-Control: public, s-maxage=3600, stale-while-revalidate=604800, stale-if-error=604800` — the fronting CDN at the apex, which has no idea a publish happened. Long TTL + very long SWR, because the webhook now purges it by tag; the TTL is only the self-healing floor for a missed purge.
  - `Netlify-Vary: query=agilitypreviewkey|ContentID|AgilityPreview` — Netlify keys on **all** query params by default, so every `?utm_source`/`?gclid` was a separate cache entry going back to origin. Only these three change the response. **Do not drop `agilitypreviewkey`**: without it a preview request matches the public cached entry and silently serves published content.
  - `Netlify-Cache-Tag: docs` — purge handle, see Purging below.
  - ⚠️ **Why proxy.ts and not `headers()`:** a `next.config` header rule is unconditional and put `CDN-Cache-Control: public` on **draft-mode renders too**, which would publish unpublished content into a shared cache. `proxy.ts` can read the `__prerender_bypass` cookie and send `Cache-Control: private, no-store` instead. Verified both ways against `next start`.
  - ✅ **Resolved (2026-09-17)** — the old "verify `CDN-Cache-Control` survives Vercel's ISR headers" warning. It survives intact; confirmed on a preview deploy, which returns both `cdn-cache-control` and `content-security-policy` alongside Vercel's own `cache-control: public, max-age=0, must-revalidate`. Production didn't show it only because the header had never been merged to `main`.
- **Personalized/auth-aware API routes:** `Cache-Control: private, no-store` (standard; every CDN respects it). Never cache HTML that varies by user.
- **Static assets:** `/docs/_next/static/*` is content-hashed and served `public, max-age=31536000, immutable` — proxies cache it under standard HTTP semantics; no vendor config needed. Excluded from the `proxy.ts` matcher, so it keeps Next's own headers.
- **Purging (LIVE):** `/api/revalidate` calls [`purgeNetlifyCache`](lib/netlify/purgeNetlifyCache.ts) on publish/unpublish, purging the `docs` tag via Netlify's purge API. Without it the apex would serve the old page until its TTL lapsed, because `revalidateTag`/`revalidatePath` only reach Vercel. Vendor-specific — recorded in the lock-in register below.
  - ⚠️ **Unverified:** Netlify's docs do not state whether `Netlify-Cache-Tag` is honoured on responses from a **proxy rewrite to an external origin**. If purge-by-tag turns out not to apply, fall back to a site-wide purge (drop `cache_tags` from the payload) or lower `s-maxage`. Test this after the first deploy — see the runbook below.
  - `stale-if-error` is set but **unverified**: Netlify documents `stale-while-revalidate` and does not mention `stale-if-error`. Unknown directives are ignored, so it costs nothing and pays off if supported.
  - Netlify rate-limits purges to **twice per tag per 5 seconds** (429). A burst of publishes can trip it; `purgeNetlifyCache` logs and moves on rather than failing the webhook.

## Vendor deltas (known differences that matter here)

| Concern | Netlify | Vercel |
|---|---|---|
| Proxy timeout | **26 s** on proxy rewrites — constrains any streaming endpoint served through the apex proxy (e.g. a future ask-AI chat route). Verify streams aren't cut; otherwise bypass the proxy for that route. | n/a (no fronting proxy when Vercel hosts the apex) |
| Cacheable response caps | — | 10 MB (non-streaming) / 20 MB (streaming) max cacheable function response |
| Durable/shared cache | `durable` directive in `Netlify-CDN-Cache-Control` (Netlify-only) | Regional edge cache; best-effort TTL |
| Purge API | `purgeCache()` + `Netlify-Cache-Tag` / `Netlify-Cache-ID` | `revalidatePath`/`revalidateTag` (Next-native) + CDN purge API |
| Next.js runtime | Netlify Next.js runtime (supports ISR, `next/image`, middleware) | Native |

## Dashboard-only settings register

Anything configured in a provider dashboard (not in this repo) MUST be recorded here.

| Setting | Where | Value / notes |
|---|---|---|
| `/docs/*` rewrite on apex | **Marketing repo, `public/_redirects` lines 16–17** (not the dashboard) | Confirmed 2026-09-17 — exact rule quoted in "Hosting map" above |
| `NETLIFY_PURGE_TOKEN` | Vercel project settings (this app) | Netlify personal access token, for the purge API |
| `NETLIFY_SITE_ID` | Vercel project settings (this app) | Site ID of the **apex/marketing** Netlify site (the one holding the cached proxy responses) — *not* this docs app |
| Environment variables | Vercel project settings | Keys listed in [AGENTS.md](AGENTS.md) §Environment Variables (`AGILITY_*`, `ALGOLIA_*`, `NEXT_PUBLIC_ALGOLIA_*`) |
| Production domain / deployment protection | Vercel project settings | ⚠️ TODO (owner): document |
| CMS webhooks (search indexing, revalidation) | Agility instance settings (67bc73e6-u) | Point at `/docs/api/search/indexArticle` etc. |

## Lock-in register

Vendor features we deliberately adopted that have **no equivalent on the other vendor**. Escape-hatch test (rebuild plan §"Hosting portability principles" rule 5) must be applied before anything is added here.

| Feature | Vendor | Why accepted | Exit plan |
|---|---|---|---|
| `Netlify-CDN-Cache-Control`, `Netlify-Vary`, `Netlify-Cache-Tag` response headers | Netlify | The apex CDN needs a longer TTL and a narrower query-vary than the portable defaults, and needs a purge handle. All three are *additive*: `CDN-Cache-Control` is still set alongside them, so a non-Netlify apex keeps working unchanged. | Delete the three `Netlify-*` header lines in `proxy.ts`. The portable `CDN-Cache-Control` already carries the behaviour; only the tuning is lost. |
| Purge API (`POST api.netlify.com/api/v1/purge`) | Netlify | Publishes must show at the apex immediately. Nothing standard exists — purge is vendor-specific everywhere. | `lib/netlify/purgeNetlifyCache.ts` is a single self-contained module called from one place, over plain HTTP with no `@netlify/*` import, and no-ops when `NETLIFY_PURGE_TOKEN`/`NETLIFY_SITE_ID` are unset. Swap the module for the new vendor's purge call, or delete it and rely on `s-maxage`. |

## App-code rules (enforced in review)

- No `@vercel/*` or `@netlify/*` imports in `app/`, `pages/`, `lib/`, `components/`, `utils/`.
- Caching expressed via standard headers (`Cache-Control`, `CDN-Cache-Control`) and Next.js primitives (`revalidate`, `revalidatePath`). The three `Netlify-*` headers and the purge call are the one sanctioned exception, are additive on top of the standard headers, and are recorded in the lock-in register.

## Verifying the cache after a deploy

Run these against the **apex** (`agilitycms.com/docs`), not the Vercel URL — the whole point is the fronting CDN.

```bash
# 1. Headers reach Netlify at all. Expect netlify-cdn-cache-control + netlify-cache-tag.
curl -sI https://agilitycms.com/docs/developers/content-fetch-api | grep -i "cache\|netlify"

# 2. It actually caches. Run twice: the second should report fwd=stale/hit, not fwd=miss.
curl -sI https://agilitycms.com/docs/developers/content-fetch-api | grep -i cache-status
curl -sI https://agilitycms.com/docs/developers/content-fetch-api | grep -i cache-status

# 3. Query noise collapses onto one entry (should hit, not miss).
curl -sI "https://agilitycms.com/docs/developers/content-fetch-api?utm_source=test" | grep -i cache-status

# 4. Purge-by-tag works through the proxy — the open question above.
#    Publish something in Agility, then re-request. If it stays stale, tags are
#    not honoured on proxied responses: fall back to a site-wide purge.
```

A draft-mode request must always return `cache-control: private, no-store` and **no** `netlify-cdn-cache-control`.
- Rewrites/redirects/headers live in `next.config` — not in `vercel.json` unless impossible otherwise (and then recorded here).
