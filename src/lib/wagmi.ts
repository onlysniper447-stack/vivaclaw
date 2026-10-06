"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { hyperEvmTestnet } from "hettnet-core";

export const wagmiConfig = createConfig({
  chains: [hyperEvmTestnet],
  connectors: [injected()],
  transports: {
    [hyperEvmTestnet.id]: http(hyperEvmTestnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
