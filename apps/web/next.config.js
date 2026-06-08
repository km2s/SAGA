/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['database'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
}

module.exports = nextConfig
