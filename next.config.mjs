/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // 환경변수는 .env 파일에서 자동으로 로드됩니다
  },
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'lh3.googleusercontent.com',
      'k.kakaocdn.net',
      'cdn.pixabay.com'
    ],
              },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig; 