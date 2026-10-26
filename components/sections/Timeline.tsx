"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { experience } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { cn, ease } from "@/lib/utils";

export function Timeline() {
  const [open, setOpen] = useState<number | null>(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 78%", "end 62%"],
  });
  const lineScale = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4 });
  const opacity = useTransform(scrollYProgress, [0, 0.06], [0, 1]);

  return (
    <section
      id="record"
      aria-labelledby="record-title"
      className="relative border-t border-bone/10 bg-ink-950"
    >
      <div className="shell py-24 sm:py-32 lg:py-36">
        <SectionHeader
          index="04"
          kicker="Deployment record"
          title={
            <span id="record-title">
              Ten years of
              <br />
              shipping seasons<span className="text-amber">.</span>
            </span>
          }
          description="Every role here came with a mandate to make something faster, safer or quieter. The log is open — expand any deployment."
          meta="5 DEPLOYMENTS"
        />

        <div ref={trackRef} className="relative mt-14 lg:mt-20">
          {/* spine */}
          <div
            aria-hidden
            className="absolute left-[calc(25%+21px)] top-2 hidden h-[calc(100%-1rem)] w-px bg-bone/10 lg:block"
          >
            <motion.div
              style={reduced ? { scaleY: 1 } : { scaleY: lineScale, opacity }}
              className="h-full w-px origin-top bg-gradient-to-b from-amber via-amber/70 to-amber/10"
            />
          </div>

          <ol className="space-y-3 sm:space-y-5">
            {experience.map((entry, i) => {
              const isOpen = open === i;
              return (
                <li key={entry.company} className="relative">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[25%_42px_1fr] lg:gap-0">
                    {/* period / company */}
                    <div className="lg:pr-10 lg:text-right">
                      <Reveal y={12}>
                        <div className="flex items-baseline gap-3 lg:justify-end">
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber/80">
                            {entry.period}
                          </span>
                          <span className="label text-[8px] text-bone/20 lg:hidden">
                            {String(experience.length - i).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="mt-1.5 text-[0.95rem] text-bone/85">{entry.company}</div>
                        <div className="label mt-1 text-[8px] text-bone/25">{entry.location}</div>
                      </Reveal>
                    </div>

                    {/* node */}
                    <div className="relative hidden items-start justify-center pt-1.5 lg:flex lg:w-[42px]">
                      <span
                        className={cn(
                          "relative z-10 mt-1 h-[11px] w-[11px] rounded-full border transition-colors duration-500",
                          isOpen
                            ? "border-amber bg-amber shadow-[0_0_18px_2px_rgba(227,164,61,0.35)]"
                            : "border-bone/25 bg-ink-950",
                        )}
                      />
                    </div>

                    {/* detail */}
                    <Reveal delay={0.04} y={14}>
                      <div
                        className={cn(
                          "group relative border border-bone/10 bg-ink-850/40 transition-colors duration-500 hover:border-bone/20 lg:ml-8",
                          isOpen && "border-amber/25 bg-ink-850/70",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setOpen(isOpen ? null : i)}
                          aria-expanded={isOpen}
                          aria-controls={`deployment-${i}`}
                          className="flex w-full items-start justify-between gap-4 p-5 text-left sm:p-6"
                        >
                          <div className="min-w-0">
                            <h3
                              className={cn(
                                "display text-[1.15rem] leading-tight transition-colors duration-500 sm:text-[1.3rem]",
                                isOpen ? "text-bone" : "text-bone/80 group-hover:text-bone",
                              )}
                            >
                              {entry.role}
                            </h3>
                            <p className="mt-2 max-w-[52ch] text-[0.82rem] leading-relaxed text-fog-400">
                              {entry.summary}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border transition-colors duration-500",
                              isOpen
                                ? "border-amber/50 text-amber"
                                : "border-bone/15 text-bone/40 group-hover:border-amber/40 group-hover:text-amber",
                            )}
                          >
                            {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen ? (
                            <motion.div
                              id={`deployment-${i}`}
                              initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                              animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                              exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                              transition={{ duration: 0.5, ease: ease.out }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-bone/10 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                                <span className="label text-[8px] text-bone/30">
                                  Achievements
                                </span>
                                <ul className="mt-3 space-y-2.5">
                                  {entry.achievements.map((a) => (
                                    <li
                                      key={a}
                                      className="flex gap-3 text-[0.83rem] leading-relaxed text-bone/70"
                                    >
                                      <span className="mt-[7px] h-1 w-1 shrink-0 bg-amber/70" />
                                      {a}
                                    </li>
                                  ))}
                                </ul>
                                <ul className="mt-5 flex flex-wrap gap-1.5">
                                  {entry.stack.map((tech) => (
                                    <li
                                      key={tech}
                                      className="border border-bone/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-bone/40"
                                    >
                                      {tech}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </Reveal>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <Reveal>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 pt-5">
            <span className="label text-[8px] text-bone/25">
              Full record available on request · references on file
            </span>
            <span className="label flex items-center gap-2 text-[8px] text-bone/25">
              <span className="h-1 w-1 rounded-full bg-signal" />
              CONTINUOUS DEPLOYMENT SINCE 2014
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
