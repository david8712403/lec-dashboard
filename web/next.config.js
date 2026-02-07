/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: require('path').join(__dirname, '..'),
  async rewrites() {
    const target = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3004';
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
