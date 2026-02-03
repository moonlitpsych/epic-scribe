const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@epic-scribe/types', '@epic-scribe/utils', '@epic-scribe/note-service'],
  // Playwright requires a real browser and should not be bundled
  serverExternalPackages: ['playwright', 'playwright-core'],
  experimental: {
    // Required for monorepo: Include workspace packages in deployment bundle
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark playwright as external to prevent bundling
      config.externals = config.externals || [];
      config.externals.push({
        'playwright': 'commonjs playwright',
        'playwright-core': 'commonjs playwright-core',
      });
    }
    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_APP_NAME: 'Epic Scribe',
    NEXT_PUBLIC_VERSION: '1.0.0',
  },
}

module.exports = nextConfig