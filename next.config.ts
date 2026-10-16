import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O sistema é quase todo dinâmico (painéis com login, cartão em tempo real).
  // Cache Components fica desligado para manter a renderização simples — ver docs/DECISOES.md.
  cacheComponents: false,
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
