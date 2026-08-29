/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma + googleapis are server-only; keep them external so they are not
  // bundled into serverless client code.
  serverExternalPackages: ['@prisma/client', 'prisma', 'googleapis'],
  async headers() {
    return [
      {
        // API responses are per-user and auth-dependent — never cache them
        // (prevents one user seeing another's cached response).
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
      {
        // Service worker must be served from the root scope and not cached hard.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
