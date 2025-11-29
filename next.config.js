/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',  // Firebase Storage
      'storage.googleapis.com',          // Google Cloud Storage
      'api.microlink.io',                // Microlink API
      'img.youtube.com',                 // YouTube thumbnails
      'i.ytimg.com',                     // YouTube thumbnails (alternative domain)
      'oaidalleapiprodscus.blob.core.windows.net',  // DALL-E API
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig