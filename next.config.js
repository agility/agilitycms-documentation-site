module.exports = {
    basePath: '/docs',
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
    }
};
