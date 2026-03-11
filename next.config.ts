import type { NextConfig } from "next";

const SERVER_EXTERNAL_PACKAGES = [
  'viem',
  '@noble/hashes',
  '@noble/curves',
  '@coinbase/agentkit',
  'ox',
];

const nextConfig: NextConfig = {
  // Не бандлить viem/@noble/*/@coinbase/agentkit — в бандле ломается @noble/hashes ("Y is not a function").
  // С Turbopack + pnpm externals могут не срабатывать для вложенных зависимостей — тогда запускайте: pnpm dev:webpack
  serverExternalPackages: SERVER_EXTERNAL_PACKAGES,
  webpack(config, { isServer }) {
    if (isServer && config.externals) {
      const isOurPackage = (req: string) =>
        SERVER_EXTERNAL_PACKAGES.some(
          (p) => req === p || req.startsWith(p + '/')
        );
      const prev = Array.isArray(config.externals)
        ? config.externals
        : [config.externals];
      config.externals = [
        (
          data: { context: string; request: string },
          cb: (err: null, result?: string) => void
        ) => {
          const req = data?.request;
          if (typeof req === 'string' && isOurPackage(req)) {
            return cb(null, 'commonjs ' + req);
          }
          const next = prev[0];
          if (typeof next === 'function') {
            return (next as (d: typeof data, c: typeof cb) => void)(data, cb);
          }
          return cb(null, undefined);
        },
        ...prev,
      ];
    }
    return config;
  },
};

export default nextConfig;
