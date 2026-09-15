import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @docsy/shared ships TypeScript source, not a build artefact.
  transpilePackages: ['@docsy/shared'],
  typedRoutes: true,
};

export default nextConfig;
