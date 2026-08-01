const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['database'],
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'media.discordapp.net' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
    ],
  },
  async headers() {
    // CSP é definido no middleware (nonce dinâmico por request) — não aqui
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security',     value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options',        value: 'nosniff' },
          { key: 'X-Frame-Options',               value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Resource-Policy',  value: 'same-origin' },
          { key: 'Cross-Origin-Opener-Policy',    value: 'same-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
