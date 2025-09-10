/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'modootree.vercel.app',
          },
        ],
        destination: 'https://modootree.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          }
        ],
      },
    ]
  },
  // Google AdSense 스크립트 허용
  async rewrites() {
    return [
      {
        source: '/pagead/js/adsbygoogle.js',
        destination: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
      }
    ];
  },
  images: {
    domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com', 'img.youtube.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  }
};

export default nextConfig; 