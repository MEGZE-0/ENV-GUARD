import { ArrowUp } from "lucide-react";
import { nav, site, socials } from "@/data/site";
import { Mark } from "@/components/chrome/Wordmark";
import { LocalTime } from "@/components/chrome/LocalTime";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-bone/10 bg-ink-950">
      <div className="shell relative pt-16 sm:pt-20">
        <div className="grid grid-cols-1 gap-12 pb-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <Mark className="h-8 w-8" />
              <span className="display text-[1.5rem] leading-none text-bone">{site.brand}</span>
            </div>
            <p className="mt-5 max-w-[34ch] text-[0.88rem] leading-relaxed text-fog-400">
              {site.tagline} Systems built to be quiet, fast and boring in the best way.
            </p>
            <a
              href="#top"
              className="group mt-8 inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-bone/40 transition-colors hover:text-amber"
            >
              <span className="flex h-7 w-7 items-center justify-center border border-bone/15 transition-colors group-hover:border-amber/40">
                <ArrowUp className="h-3 w-3" />
              </span>
              Return to command
            </a>
          </div>

          {/* Index */}
          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="label text-[8px] text-bone/25">Index</h2>
            <ul className="mt-4 space-y-2.5">
              {nav.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex items-baseline gap-2.5 text-[0.84rem] text-bone/55 transition-colors hover:text-bone"
                  >
                    <span className="font-mono text-[8px] text-bone/20 transition-colors group-hover:text-amber/70">
                      {item.index}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Channels */}
          <div className="lg:col-span-2">
            <h2 className="label text-[8px] text-bone/25">Channels</h2>
            <ul className="mt-4 space-y-2.5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[0.84rem] text-bone/55 transition-colors hover:text-bone"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${site.email}`}
                  className="text-[0.84rem] text-bone/55 transition-colors hover:text-bone"
                >
                  Email
                </a>
              </li>
            </ul>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <h2 className="label text-[8px] text-bone/25">Status</h2>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                <span className="text-[0.8rem] text-bone/60">{site.availability}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                <span className="text-[0.8rem] text-bone/60">Systems nominal</span>
              </li>
              <li className="flex items-center justify-between gap-2 border-t border-bone/10 pt-3">
                <span className="label text-[7.5px] text-bone/25">Local</span>
                <LocalTime />
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="label text-[7.5px] text-bone/25">Build</span>
                <span className="font-mono text-[10px] text-bone/45">{site.version}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Baseline */}
        <div className="flex flex-col-reverse gap-4 border-t border-bone/10 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-bone/25">
              © {year} {site.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-bone/20">
              Built with Next.js · React · Tailwind · Framer Motion
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="label text-[7.5px] text-bone/20">Designed &amp; engineered in-house</span>
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-1 w-1 rounded-full bg-amber/80" />
              <span className="h-1 w-1 rounded-full bg-amber/40" />
              <span className="h-1 w-1 rounded-full bg-bone/15" />
            </div>
          </div>
        </div>
      </div>

      {/* Oversized ghost wordmark, clipped by the viewport edge */}
      <div aria-hidden className="relative select-none overflow-hidden">
        <div className="shell">
          <div className="display -mb-[0.18em] translate-y-[0.06em] whitespace-nowrap text-[clamp(3.4rem,15vw,14rem)] leading-[0.75] text-transparent [-webkit-text-stroke:1px_rgba(236,231,220,0.1)]">
            ENV/GUARD
          </div>
        </div>
      </div>
    </footer>
  );
}
