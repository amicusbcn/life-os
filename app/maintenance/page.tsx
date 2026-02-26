// next.config.js
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/maintenance',
        destination: '/maintenance/active',
        permanent: true, // true para SEO, false si crees que podrías cambiarlo pronto
      },
    ]
  },
}