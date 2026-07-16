module.exports = {
    basePath: '/docs',
    // A stray lockfile in the parent directory makes Next infer the wrong
    // workspace root for output file tracing — pin it to this repo.
    outputFileTracingRoot: __dirname,
    // applicationinsights uses dynamic requires (diagnostic-channel probes) that
    // can't be bundled — load it from node_modules at runtime instead.
    serverExternalPackages: ['applicationinsights'],
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
                // RFC 9213 targeted cache header: lets the fronting CDN (Netlify
                // today — see HOSTING.md) cache docs pages at its edge and refresh
                // in the background. Excludes /api/* — those must never be cached.
                source: '/((?!api/).*)',
                headers: [
                    {
                        key: 'CDN-Cache-Control',
                        value: 'public, s-maxage=60, stale-while-revalidate=86400'
                    }
                ]
            }
        ];
    }
};
