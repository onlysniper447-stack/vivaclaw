"use client";

import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors";
import { hyperEvm, hyperEvmTestnet } from "hettnet-core";

export const wagmiConfig = createConfig({
  chains: [hyperEvmTestnet, hyperEvm],
  connectors: [injected()],
  transports: {
    [hyperEvmTestnet.id]: http(hyperEvmTestnet.rpcUrls.default.http[0]),
    [hyperEvm.id]: http(hyperEvm.rpcUrls.default.http[0]),
  },
  ssr: true,
});
