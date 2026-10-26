"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { nav, site, socials } from "@/data/site";
import { cn, ease } from "@/lib/utils";
import { Wordmark } from "./Wordmark";
import { useLenisInstance } from "@/components/providers/SmoothScroll";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const lenis = useLenisInstance();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );

    nav.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      lenis?.start();
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, lenis]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[70] transition-[background,backdrop-filter,border-color] duration-700 ease-tactical",
          scrolled || open
            ? "border-b border-bone/10 bg-ink-950/75 backdrop-blur-xl"
            : "border-b border-transparent bg-gradient-to-b from-ink-950/60 to-transparent",
        )}
      >
        <div className="shell flex h-[72px] items-center justify-between gap-6">
          <a href="#top" aria-label={`${site.name} — home`} className="shrink-0">
            <Wordmark />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            {nav.map((item) => {
              const isActive = active === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "group relative flex items-baseline gap-2 px-3.5 py-2 transition-colors duration-300",
                    isActive ? "text-bone" : "text-fog-400 hover:text-bone/90",
                  )}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={cn(
                      "label text-[9px] transition-colors duration-300",
                      isActive ? "text-amber" : "text-bone/20 group-hover:text-amber/70",
                    )}
                  >
                    {item.index}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "absolute inset-x-3.5 bottom-1 h-px origin-left bg-amber transition-transform duration-500 ease-tactical",
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="label hidden items-center gap-2 text-bone/35 xl:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-amber/70" />
                <span className="relative h-1.5 w-1.5 rounded-full bg-amber" />
              </span>
              {site.availability}
            </span>

            <a
              href="#contact"
              className="group relative hidden h-[38px] items-center gap-2 overflow-hidden notch-sm border border-bone/20 px-4 font-mono text-[10px] uppercase tracking-[0.18em] text-bone/80 transition-colors duration-500 hover:border-amber hover:text-ink-950 sm:flex"
            >
              <span className="absolute inset-0 origin-bottom scale-y-0 bg-amber transition-transform duration-500 ease-tactical group-hover:scale-y-100" />
              <span className="relative z-10">Open channel</span>
              <ArrowUpRight className="relative z-10 h-3 w-3 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="relative flex h-10 w-10 items-center justify-center border border-bone/15 lg:hidden"
            >
              <span className="sr-only">Menu</span>
              <span
                className={cn(
                  "absolute h-px w-4 bg-bone transition-all duration-[400ms] ease-tactical",
                  open ? "rotate-45" : "-translate-y-[3px]",
                )}
              />
              <span
                className={cn(
                  "absolute h-px w-4 bg-bone transition-all duration-[400ms] ease-tactical",
                  open ? "-rotate-45" : "translate-y-[3px]",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[68] flex flex-col justify-between bg-ink-950/95 px-6 pb-8 pt-24 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: ease.out }}
          >
            <div className="hud-grid pointer-events-none absolute inset-0 opacity-40" />
            <nav aria-label="Mobile" className="relative flex flex-col">
              {nav.map((item, i) => (
                <motion.a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline justify-between border-b border-bone/10 py-5"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 + i * 0.05, duration: 0.6, ease: ease.out }}
                >
                  <span className="flex items-baseline gap-4">
                    <span className="label text-[9px] text-amber/70">{item.index}</span>
                    <span className="font-display text-[clamp(2rem,9vw,2.9rem)] leading-none text-bone/90 transition-colors group-hover:text-amber">
                      {item.label}
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-bone/30 transition-all group-hover:text-amber" />
                </motion.a>
              ))}
            </nav>

            <div className="relative mt-10 flex flex-col gap-5">
              <a
                href={`mailto:${site.email}`}
                className="font-mono text-xs uppercase tracking-[0.18em] text-amber"
              >
                {site.email}
              </a>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="label text-bone/40 hover:text-bone"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
              <div className="hairline" />
              <span className="label flex items-center gap-2 text-bone/30">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                {site.availability} · {site.location}
              </span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
