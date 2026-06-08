const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['database'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  outputFileTracingIncludes: {
    '**': [
      '../../node_modules/.pnpm/**/node_modules/.prisma/client/**',
      '../../node_modules/.pnpm/**/node_modules/@prisma/client/**',
      '../../packages/database/node_modules/.prisma/client/**',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

module.exports = nextConfig
