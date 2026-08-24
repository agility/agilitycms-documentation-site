# HOSTING.md — deployment topology, portability contract, and vendor register

This site follows the **hosting portability principles** in [docs/rebuild-plan-2026.md](docs/rebuild-plan-2026.md) §"Hosting portability principles": either site (marketing or docs) must be hostable on **Vercel, Netlify, or any combination** without code changes. This file is the operational record: the proxy contract, the cache strategy, every vendor-specific or dashboard-only setting, and the lock-in register.

## Current topology (2026-07)

| Site | Host | Repo |
|---|---|---|
| agilitycms.com (apex / marketing) | **Netlify** | Agility-Website-Nextjs (being rebuilt from scratch in a new repo/instance) |
| agilitycms.com/docs (this app) | **Vercel** | this repo — Next.js with `basePath: '/docs'` |

The apex proxies `/docs/*` to this app's Vercel deployment via a Netlify rewrite. ⚠️ **TODO (owner):** the rewrite currently lives in Netlify dashboard config, not in a repo. Check it into the marketing repo's `netlify.toml` (recipe below) and note the change here.

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

- **Pages (planned, Phase 0):** the docs app will emit the RFC 9213 header `CDN-Cache-Control: public, s-maxage=60, stale-while-revalidate=86400` on article/page responses. Both Netlify and Vercel honor this header for their own edge caches with identical precedence (`<Vendor>-CDN-Cache-Control` > `CDN-Cache-Control` > `Cache-Control`), so the fronting CDN caches pages regardless of vendor. ⚠️ Before enabling: verify interaction with Vercel's ISR-managed cache headers (Vercel controls `Cache-Control` on ISR routes; confirm `CDN-Cache-Control` set via `headers()` or route handlers survives to the response).
- **Personalized/auth-aware API routes:** `Cache-Control: private, no-store` (standard; every CDN respects it). Never cache HTML that varies by user.
- **Static assets:** `/docs/_next/static/*` is content-hashed and served `public, max-age=31536000, immutable` — proxies cache it under standard HTTP semantics; no vendor config needed.
- **Purging:** avoided by design (short TTL + long SWR). If instant purge ever becomes necessary, cache tags and purge APIs are vendor-specific — record the mechanism in the lock-in register before adopting.

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
| `/docs/*` rewrite on apex | Netlify dashboard (marketing site) | ⚠️ TODO (owner): confirm exact rule + move into marketing repo's `netlify.toml` |
| Environment variables | Vercel project settings | Keys listed in [AGENTS.md](AGENTS.md) §Environment Variables (`AGILITY_*`, `ALGOLIA_*`, `NEXT_PUBLIC_ALGOLIA_*`) |
| Production domain / deployment protection | Vercel project settings | ⚠️ TODO (owner): document |
| CMS webhooks (search indexing, revalidation) | Agility instance settings (67bc73e6-u) | Point at `/docs/api/search/indexArticle` etc. |

## Lock-in register

Vendor features we deliberately adopted that have **no equivalent on the other vendor**. Escape-hatch test (rebuild plan §"Hosting portability principles" rule 5) must be applied before anything is added here.

| Feature | Vendor | Why accepted | Exit plan |
|---|---|---|---|
| *(empty — keep it that way)* | | | |

## App-code rules (enforced in review)

- No `@vercel/*` or `@netlify/*` imports in `app/`, `pages/`, `lib/`, `components/`, `utils/`.
- Caching expressed only via standard headers (`Cache-Control`, `CDN-Cache-Control`) and Next.js primitives (`revalidate`, `revalidatePath`).
- Rewrites/redirects/headers live in `next.config` — not in `vercel.json` unless impossible otherwise (and then recorded here).
