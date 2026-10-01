import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  outputFileTracingRoot: projectRoot,
  serverExternalPackages: [
    "@solana/web3.js",
    "@solana/kit",
    "@solana/spl-token",
    "@kamino-finance/klend-sdk",
    "@solana-program/compute-budget",
    "@solana-program/memo",
    "@meteora-ag/vault-sdk",
    "@coral-xyz/anchor",
    "@pythnetwork/price-service-client",
    "@pythnetwork/hermes-client",
    "@jup-ag/api",
    "bn.js",
    "ws",
  ],
  // Next.js 16 builds with Turbopack unless `--webpack` is passed.
  // Solana SDKs still need these browser fallbacks, so `npm run build` stays on Webpack.
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      encoding: false,
      ...(isServer
        ? {}
        : {
            crypto: false,
            stream: false,
            path: false,
          }),
    };

    if (Array.isArray(config.externals)) {
      config.externals.push("pino-pretty", "lokijs", "encoding");
    }

    return config;
  },
};

export default nextConfig;
