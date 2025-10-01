/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',  // Firebase Storage
      'api.microlink.io',                // Microlink API
      'img.youtube.com',                 // YouTube thumbnails
      'i.ytimg.com',                     // YouTube thumbnails (alternative domain)
      'oaidalleapiprodscus.blob.core.windows.net',  // DALL-E API
    ],
  },
}

module.exports = nextConfig