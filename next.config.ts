import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite is a WASM build of PostgreSQL and must stay outside the bundler.
  // In production the app connects to a managed PostgreSQL instead.
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // Comprobantes de pago (imágenes/PDF) viajan por Server Actions.
    serverActions: { bodySizeLimit: "8mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
