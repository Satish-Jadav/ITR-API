/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  serverExternalPackages: ['pg', 'pino', 'pino-pretty'],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  webpack: (config, { dev }) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    if (!dev) {
      // Disable heavy filesystem disk caching during production builds to eliminate bloated 200MB build cache uploads
      config.cache = false;
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
      {
        source: '/health',
        destination: '/api/health',
      },
    ];
  },
};

export default nextConfig;
