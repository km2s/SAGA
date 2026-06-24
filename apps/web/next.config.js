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
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://cdn.discordapp.com https://media.discordapp.net https://res.cloudinary.com https://i.imgur.com data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self' https://www.youtube-nocookie.com",
      "frame-src https://www.youtube-nocookie.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy',       value: csp },
          { key: 'Strict-Transport-Security',     value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options',        value: 'nosniff' },
          { key: 'X-Frame-Options',               value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Resource-Policy',  value: 'same-origin' },
          { key: 'Cross-Origin-Opener-Policy',    value: 'same-origin' },
          // X-XSS-Protection removido — obsoleto e pode causar vulnerabilidades em browsers antigos
        ],
      },
    ]
  },
}

module.exports = nextConfig
