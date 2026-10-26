"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { testimonials, proofMetrics } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { Counter } from "@/components/primitives/Counter";
import { cn, ease } from "@/lib/utils";

const DURATION = 9000;

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = testimonials[index];
  const go = useCallback(
    (dir: number) =>
      setIndex((i) => (i + dir + testimonials.length) % testimonials.length),
    [],
  );

  useEffect(() => {
    if (paused || reduced) return;
    timer.current = setInterval(() => go(1), DURATION);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reduced, go]);

  return (
    <section
      id="proof"
      aria-labelledby="proof-title"
      className="relative border-t border-bone/10 bg-ink-950"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/media/topo.webp')] bg-cover bg-center opacity-[0.05] mix-blend-luminosity mask-fade-b"
      />
      <div className="shell relative py-24 sm:py-32 lg:py-36">
        <SectionHeader
          index="05B"
          kicker="Signal intelligence"
          title={
            <span id="proof-title">
              Trusted
              <br />
              under load<span className="text-amber">.</span>
            </span>
          }
          description="No mood board testimonials. These are the people who approved the budget, ran the incident channel and signed the launch."
          meta="4 CONFIRMED REPORTS"
        />

        <div
          className="mt-12 grid grid-cols-1 gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Quote panel */}
          <Reveal className="lg:col-span-8" amount={0.15}>
            <div className="relative border border-bone/10 bg-ink-850/50 p-6 sm:p-9 lg:min-h-[380px] lg:p-12">
              <Quote
                className="absolute right-6 top-6 h-10 w-10 text-amber/15 sm:h-14 sm:w-14"
                strokeWidth={1}
                aria-hidden
              />
              <span className="label text-amber/70">Field report</span>

              <div className="relative mt-8 min-h-[210px] sm:min-h-[190px]">
                <AnimatePresence mode="wait">
                  <motion.blockquote
                    key={current.name}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: ease.out }}
                  >
                    <p className="max-w-[46ch] text-[1.05rem] leading-[1.6] text-bone/90 sm:text-[1.22rem]">
                      {current.quote}
                    </p>

                    <footer className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
                      <span className="flex h-11 w-11 items-center justify-center border border-amber/30 bg-amber/[0.07] font-mono text-[11px] tracking-[0.08em] text-amber">
                        {current.initials}
                      </span>
                      <span>
                        <span className="block text-[0.9rem] text-bone/85">{current.name}</span>
                        <span className="label mt-1 block text-[8px] text-bone/35">
                          {current.role} · {current.company}
                        </span>
                      </span>
                      <span className="ml-auto flex items-center gap-2 border border-bone/15 px-2.5 py-1.5">
                        <span className="h-1 w-1 rounded-full bg-signal" />
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-bone/60">
                          {current.metric}
                        </span>
                      </span>
                    </footer>
                  </motion.blockquote>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="mt-8 flex items-center gap-4 border-t border-bone/10 pt-5">
                <span className="font-mono text-[10px] tabular text-bone/40">
                  {String(index + 1).padStart(2, "0")}
                  <span className="text-bone/20"> / {String(testimonials.length).padStart(2, "0")}</span>
                </span>

                <div className="relative h-px flex-1 overflow-hidden bg-bone/10">
                  <motion.span
                    key={`${index}-${paused}`}
                    className="absolute inset-y-0 left-0 bg-amber/70"
                    initial={{ width: "0%" }}
                    animate={{ width: reduced || paused ? "0%" : "100%" }}
                    transition={{ duration: reduced || paused ? 0 : DURATION / 1000, ease: "linear" }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous testimonial"
                    className="flex h-9 w-9 items-center justify-center border border-bone/15 text-bone/50 transition-colors hover:border-amber/50 hover:text-amber"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next testimonial"
                    className="flex h-9 w-9 items-center justify-center border border-bone/15 text-bone/50 transition-colors hover:border-amber/50 hover:text-amber"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Selector */}
          <div className="lg:col-span-4">
            <Reveal amount={0.15} delay={0.06}>
              <div className="flex h-full flex-col border border-bone/10">
                <div className="flex items-center justify-between border-b border-bone/10 px-4 py-3">
                  <span className="label text-[8px] text-bone/30">Verified channels</span>
                  <span className="label text-[8px] text-amber/50">04</span>
                </div>
                <ul className="flex flex-1 flex-col">
                  {testimonials.map((t, i) => {
                    const active = i === index;
                    return (
                      <li key={t.name} className="flex-1">
                        <button
                          type="button"
                          onClick={() => setIndex(i)}
                          aria-pressed={active}
                          aria-label={`Read testimonial from ${t.name}`}
                          className={cn(
                            "group relative flex h-full w-full items-center gap-3 border-b border-bone/10 px-4 py-4 text-left transition-colors duration-500 last:border-b-0",
                            active ? "bg-bone/[0.04]" : "hover:bg-bone/[0.02]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute inset-y-0 left-0 w-px transition-colors duration-500",
                              active ? "bg-amber" : "bg-transparent",
                            )}
                          />
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center border font-mono text-[10px] transition-colors duration-500",
                              active
                                ? "border-amber/40 text-amber"
                                : "border-bone/15 text-bone/35 group-hover:text-bone/60",
                            )}
                          >
                            {t.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block truncate text-[0.82rem] transition-colors duration-500",
                                active ? "text-bone" : "text-bone/60 group-hover:text-bone/85",
                              )}
                            >
                              {t.name}
                            </span>
                            <span className="label mt-1 block truncate text-[7.5px] text-bone/25">
                              {t.company}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "h-1 w-1 shrink-0 rounded-full transition-colors duration-500",
                              active ? "bg-amber" : "bg-bone/15",
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="label text-[8px] text-bone/25">Median engagement</span>
                  <span className="font-mono text-[9px] text-bone/55">14 MONTHS</span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Proof metrics */}
        <Reveal delay={0.05}>
          <div className="mt-10 grid grid-cols-2 gap-y-7 border-t border-bone/10 pt-7 sm:grid-cols-4">
            {proofMetrics.map((m, i) => (
              <div
                key={m.label}
                className={cn("flex flex-col gap-1.5", i > 0 && "sm:border-l sm:border-bone/10 sm:pl-6")}
              >
                <span className="display text-[clamp(1.5rem,2.2vw,2rem)] leading-none text-bone">
                  <Counter value={m.value} />
                </span>
                <span className="label text-[8px] text-bone/30">{m.label}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
