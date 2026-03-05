import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Aquí ampliamos el límite
    },
  },
  async redirects() {
    return [
      {
        source: '/maintenance',
        destination: '/maintenance/active',
        permanent: false, // Usamos false por si en el futuro decides cambiar la ruta por defecto
      },
      {
        source: '/properties/:slug/maintenance',
        destination: '/properties/:slug/maintenance/active',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;