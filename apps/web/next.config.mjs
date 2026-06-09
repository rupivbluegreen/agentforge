/** @type {import('next').NextConfig} */
const target = process.env.API_PROXY_TARGET ?? 'http://localhost:3000';

const nextConfig = {
  reactStrictMode: true,
  // Linting is handled by the monorepo tooling; type-checking still runs in `next build`.
  eslint: { ignoreDuringBuilds: true },
  // Proxy /api/* to the control-plane API so the browser uses a single origin
  // (cookies set by the API are first-party on the web origin).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${target}/:path*` }];
  },
};

export default nextConfig;
