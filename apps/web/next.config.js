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
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

module.exports = nextConfig
