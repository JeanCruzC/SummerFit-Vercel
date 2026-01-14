/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Redirecciones eliminadas para permitir ver la Landing Page en /
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'guokspyuzpvzsobhfbvx.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
