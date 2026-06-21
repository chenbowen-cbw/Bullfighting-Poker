/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@bullfighting/core',
    '@bullfighting/auth',
    '@bullfighting/db',
    '@bullfighting/rooms',
    '@bullfighting/game',
  ],
  // 本仓库已在 CI 用根 ESLint 统一检查,关闭 Next 构建期重复 lint
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
