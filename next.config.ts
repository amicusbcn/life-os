import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Aquí ampliamos el límite
    },
  },
};

export default nextConfig;