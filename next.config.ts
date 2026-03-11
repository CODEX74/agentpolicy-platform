import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Не бандлить viem/@noble/hashes/@coinbase/agentkit — в бандле ломается @noble/hashes ("Y is not a function")
  serverExternalPackages: ['viem', '@noble/hashes', '@coinbase/agentkit'],
};

export default nextConfig;
