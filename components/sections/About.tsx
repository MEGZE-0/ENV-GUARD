"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { about } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal, Stagger, staggerChild } from "@/components/primitives/Reveal";
import { Brackets } from "@/components/primitives/Brackets";
import { ease } from "@/lib/utils";

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <section id="brief" aria-labelledby="brief-title" className="relative border-t border-bone/10">
      <div className="shell py-24 sm:py-32 lg:py-40">
        <SectionHeader
          index="01"
          kicker="Mission brief"
          title={
            <span id="brief-title">
              Calm delivery
              <br />
              under real pressure<span className="text-amber">.</span>
            </span>
          }
          description="Not a portfolio of screenshots. A record of systems that went live, stayed up and made someone's week easier."
        />

        <div className="mt-16 grid grid-cols-1 gap-14 lg:mt-24 lg:grid-cols-12 lg:gap-16">
          {/* Portrait */}
          <div className="lg:col-span-5">
            <Reveal>
              <div ref={ref} className="relative">
                <div className="relative">
                  <Brackets className="-inset-3 z-20" size={16} />
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink-850 notch">
                    <motion.div
                      className="absolute inset-[-6%]"
                      style={reduced ? undefined : { y: imageY }}
                      initial={reduced ? undefined : { clipPath: "inset(0 0 100% 0)" }}
                      whileInView={reduced ? undefined : { clipPath: "inset(0 0 0% 0)" }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 1.3, ease: ease.out, delay: 0.1 }}
                    >
                      <Image
                        src={about.portrait}
                        alt={about.portraitAlt}
                        fill
                        sizes="(min-width: 1024px) 42vw, 92vw"
                        className="object-cover object-center opacity-100 brightness-[1.12] saturate-[0.62] transition-[filter,transform] duration-[1200ms] ease-tactical hover:saturate-100"
                      />
                    </motion.div>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,8,0.45)_0%,transparent_28%,transparent_58%,rgba(6,7,8,0.92)_100%)]" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.16] scanlines" />

                    <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                      <span className="label flex items-center gap-2 text-[8px] text-bone/55">
                        <span className="h-1 w-1 rounded-full bg-alert" />
                        Operator · 042
                      </span>
                      <span className="label text-[8px] text-bone/35">REC ●</span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                      <div>
                        <div className="display text-[1.4rem] leading-none text-bone">
                          D. Rourke
                        </div>
                        <div className="label mt-2 text-[8px] text-bone/45">
                          Principal engineer · Berlin
                        </div>
                      </div>
                      <span className="label text-[8px] text-amber/80">UTC+2</span>
                    </div>
                  </div>
                </div>

                {/* Offset data plate */}
                <div className="absolute -bottom-6 -right-3 z-30 hidden items-center gap-4 border border-amber/25 bg-ink-900/95 px-5 py-4 backdrop-blur-sm sm:flex">
                  <span className="display text-[2.1rem] leading-none text-amber">10</span>
                  <span className="label max-w-[78px] text-[8px] leading-[1.6] text-bone/50">
                    Years in production
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Brief copy */}
          <div className="lg:col-span-7 lg:pl-6 xl:pl-12">
            <Reveal>
              <span className="label text-amber/80">Personal log</span>
            </Reveal>

            <div className="mt-5 space-y-5">
              {about.paragraphs.map((paragraph, i) => (
                <Reveal key={i} delay={0.05 + i * 0.08}>
                  <p
                    className={
                      i === 0
                        ? "text-[1.06rem] leading-[1.75] text-bone/80 sm:text-[1.15rem]"
                        : "body-copy"
                    }
                  >
                    {paragraph}
                  </p>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.16}>
              <blockquote className="relative mt-9 border-l border-amber/45 pl-6">
                <span className="label text-amber/70">Mission statement</span>
                <p className="mt-3 max-w-[42ch] font-sans text-[1.05rem] leading-[1.6] tracking-[-0.005em] text-bone/90 sm:text-[1.15rem]">
                  {about.mission}
                </p>
              </blockquote>
            </Reveal>

            <Stagger className="mt-11 grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
              {about.facts.map((fact) => (
                <motion.div
                  key={fact.k}
                  variants={staggerChild}
                  className="flex items-baseline justify-between gap-5 border-b border-bone/10 py-3.5"
                >
                  <span className="label text-[9px] text-bone/35">{fact.k}</span>
                  <span className="text-right text-[0.82rem] text-bone/75">{fact.v}</span>
                </motion.div>
              ))}
            </Stagger>

            <div className="mt-14">
              <Reveal>
                <div className="flex items-center gap-3">
                  <span className="label text-bone/35">Core principles</span>
                  <span className="h-px flex-1 bg-bone/10" />
                </div>
              </Reveal>

              <Stagger className="mt-6 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {about.principles.map((p) => (
                  <motion.div
                    key={p.n}
                    variants={staggerChild}
                    className="group relative border-t border-bone/10 py-5 transition-colors duration-500 hover:border-amber/35"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[10px] text-amber/70">{p.n}</span>
                      <h3 className="text-[0.95rem] font-medium tracking-[-0.01em] text-bone/90">
                        {p.title}
                      </h3>
                    </div>
                    <p className="mt-2 pl-7 text-[0.82rem] leading-relaxed text-fog-400 transition-colors duration-500 group-hover:text-fog-300">
                      {p.copy}
                    </p>
                  </motion.div>
                ))}
              </Stagger>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
