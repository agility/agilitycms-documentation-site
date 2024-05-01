module.exports = {
    basePath: '/docs',
    async rewrites() {
        return [
            {
                source: '/robots.txt',
                destination: '/api/robots'
            }
        ];
    }
};
