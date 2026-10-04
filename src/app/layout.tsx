import type { Metadata, Viewport } from "next";
import { Geist_Mono, Sora } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const description =
  "Hettnet is yield and liquidity-pool intelligence for Hyperliquid, for people and AI agents. Indications are informational, not financial advice. Non-custodial: the app never holds funds or keys.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  title: {
    default: "Hettnet",
    template: "%s · Hettnet",
  },
  applicationName: "Hettnet",
  description,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Hettnet",
    description,
    siteName: "Hettnet",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hettnet",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
