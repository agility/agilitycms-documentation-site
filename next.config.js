module.exports = {
    basePath: '/docs',
    // A stray lockfile in the parent directory makes Next infer the wrong
    // workspace root for output file tracing — pin it to this repo.
    outputFileTracingRoot: __dirname,
    // applicationinsights uses dynamic requires (diagnostic-channel probes) that
    // can't be bundled — load it from node_modules at runtime instead.
    serverExternalPackages: ['applicationinsights'],
    // Cache Components (Next 16): 'use cache' + cacheTag/cacheLife power the
    // data layer in lib/cms; the /api/revalidate webhook gives instant
    // invalidation via revalidateTag. See AGENTS.md "Caching".
    cacheComponents: true,
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**.agilitycms.com' },
            { protocol: 'https', hostname: 'cdn.agilitycms.com' },
            { protocol: 'https', hostname: 'cdn.aglty.io' },
        ],
    },
    async redirects() {
        return [
            {
                // docs.agilitycms.com serves this app straight from Vercel, so
                // its ROOT /robots.txt sits outside basePath and used to 404,
                // leaving the whole duplicate host crawlable. Send that one
                // request to a route that disallows everything.
                //
                // - `has` pins it to the docs.agilitycms.com host. The apex
                //   agilitycms.com/robots.txt belongs to the marketing site,
                //   which only proxies /docs/* here, so it can't be affected.
                // - `basePath: false` lets it match the root path.
                // - A redirect, not a rewrite: Next only allows a basePath:false
                //   rewrite to an external URL. Crawlers follow redirects for
                //   robots.txt (RFC 9309 asks for at least five hops).
                //
                // See app/api/robots/subdomain/route.ts and HOSTING.md.
                source: '/robots.txt',
                destination: '/docs/api/robots/subdomain',
                basePath: false,
                permanent: false,
                has: [{ type: 'host', value: 'docs.agilitycms.com' }]
            }
        ];
    },
    async rewrites() {
        return [
            {
                source: '/robots.txt',
                destination: '/api/robots'
            }
        ];
    },
    async headers() {
        return [
            {
                // Cache headers used to live here, but this rule is unconditional
                // and would have put `CDN-Cache-Control: public` on draft-mode
                // renders too — publishing unpublished content to a shared cache.
                // They now live in proxy.ts, which can see the draft cookie.
                // See HOSTING.md "Cache strategy".
                source: '/((?!api/).*)',
                headers: [
                    {
                        // Allow the Agility Web Studio to iframe the site for
                        // in-context editing/preview.
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'self' https://app.agilitycms.com;"
                    }
                ]
            }
        ];
    }
};
