import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'prisma', 'cheerio'],
  async redirects() {
    return [
      { source: '/icon', destination: '/icons/icon-32.png', permanent: true },
      { source: '/apple-icon', destination: '/icons/icon-180.png', permanent: true },
      { source: '/icons/192', destination: '/icons/icon-192.png', permanent: true },
      { source: '/icons/512', destination: '/icons/icon-512.png', permanent: true },
    ]
  },
}

export default nextConfig
