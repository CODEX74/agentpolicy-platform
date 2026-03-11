import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Не бандлить viem/@noble/*/@coinbase/agentkit — в бандле ломается @noble/hashes ("Y is not a function").
  // С Turbopack + pnpm externals могут не срабатывать для вложенных зависимостей — тогда запускайте: pnpm dev:webpack
  serverExternalPackages: [
    'viem',
    '@noble/hashes',
    '@noble/curves',
    '@coinbase/agentkit',
    'ox',
  ],
};

export default nextConfig;
