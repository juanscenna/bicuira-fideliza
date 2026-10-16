import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O sistema é quase todo dinâmico (painéis com login, cartão em tempo real).
  // Cache Components fica desligado para manter a renderização simples — ver docs/DECISOES.md.
  cacheComponents: false,
  experimental: {
    // logo do estabelecimento (até 2 MB) é enviada por Server Action
    serverActions: { bodySizeLimit: "3mb" },
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
