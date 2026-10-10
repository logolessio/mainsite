/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  async redirects() {
    return [{ source: '/campaigns', destination: '/', permanent: true }]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
