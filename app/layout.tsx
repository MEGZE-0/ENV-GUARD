import type { Metadata, Viewport } from "next";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "lenis/dist/lenis.css";
import "./globals.css";

import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { FrameOverlay } from "@/components/chrome/FrameOverlay";
import { Preloader } from "@/components/chrome/Preloader";
import { Cursor } from "@/components/chrome/Cursor";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/sections/Footer";
import { site } from "@/data/site";

export const metadata: Metadata = {
  metadataBase: new URL("https://envguard.dev"),
  title: {
    default: `${site.name} — ${site.role} / ${site.brand}`,
    template: `%s · ${site.brand}`,
  },
  description: site.description,
  keywords: [
    "full-stack developer",
    "product engineer",
    "Next.js",
    "TypeScript",
    "React",
    "SaaS",
    "systems architecture",
    "portfolio",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  openGraph: {
    type: "website",
    title: `${site.name} — ${site.role}`,
    description: site.description,
    siteName: site.brand,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.role}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#060708",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-ink-950 text-bone antialiased">
        {/* Without JS, motion "initial" states would hide content — this guarantees a readable page. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                '[style*="opacity:0"]{opacity:1!important}[style*="clip-path:inset"]{clip-path:none!important}[style*="transform:translate"]{transform:none!important}',
            }}
          />
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-amber focus:bg-ink-900 focus:px-4 focus:py-2 focus:font-mono focus:text-[10px] focus:uppercase focus:tracking-[0.18em] focus:text-amber"
        >
          Skip to content
        </a>

        <SmoothScroll>
          <FrameOverlay />
          <Preloader />
          <Nav />
          <main id="main">{children}</main>
          <Footer />
          <Cursor />
        </SmoothScroll>
      </body>
    </html>
  );
}
