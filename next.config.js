/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(tsx|ts|jsx|js)$/,
      include: [/src/],
      resolve: {
        alias: {
          'solana-drain-demo': false,
        },
      },
    });
    return config;
  },
  distDir: '.next',
}

module.exports = nextConfig
