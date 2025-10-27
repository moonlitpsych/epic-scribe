/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@epic-scribe/types', '@epic-scribe/utils', '@epic-scribe/note-service'],
  env: {
    NEXT_PUBLIC_APP_NAME: 'Epic Scribe',
    NEXT_PUBLIC_VERSION: '1.0.0',
  },
}

module.exports = nextConfig