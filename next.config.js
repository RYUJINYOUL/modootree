/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'firebasestorage.googleapis.com',  // Firebase Storage
      'api.microlink.io',                // Microlink API (이전에 추가한 도메인)
    ],
  },
}

module.exports = nextConfig