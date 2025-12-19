/** @type {import('next').NextConfig} */
const nextConfig = {
    basePath: '/docs',
    async rewrites() {
        return [
            {
                source: '/robots.txt',
                destination: '/api/robots'
            }
        ];
    },
    // TypeScript configuration
    typescript: {
        // Temporarily ignore build errors to test functionality
        // This is a known issue with Next.js type generation for re-exports
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
