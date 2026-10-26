"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Code2, Server, Database, Cloud, Wrench, PenTool } from "lucide-react";
import { arsenal, type SkillCategory } from "@/data/site";
import { cn, ease } from "@/lib/utils";

const ICONS = {
  code: Code2,
  server: Server,
  database: Database,
  cloud: Cloud,
  wrench: Wrench,
  pen: PenTool,
} as const;

export function SkillsTablet() {
  const [tab, setTab] = useState(0);
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const category = arsenal[tab];

  // --- pointer tilt -------------------------------------------------
  const nx = useMotionValue(0);
  const ny = useMotionValue(0);
  const rotateX = useSpring(useTransform(ny, [-0.5, 0.5], [4.5, -4.5]), {
    stiffness: 110,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(nx, [-0.5, 0.5], [-7, 7]), {
    stiffness: 110,
    damping: 18,
  });
  const glareX = useTransform(nx, [-0.5, 0.5], [18, 82]);
  const glareY = useTransform(ny, [-0.5, 0.5], [8, 92]);
  const glare = useMotionTemplate`radial-gradient(560px circle at ${glareX}% ${glareY}%, rgba(236,231,220,0.075), transparent 62%)`;

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || e.pointerType === "touch") return;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      nx.set((e.clientX - rect.left) / rect.width - 0.5);
      ny.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [nx, ny, reduced],
  );

  const reset = useCallback(() => {
    nx.set(0);
    ny.set(0);
  }, [nx, ny]);

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    const last = arsenal.length - 1;
    let next = index;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div
      ref={stageRef}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className="relative mx-auto w-full max-w-[1220px] [perspective:1700px]"
    >
      {/* Ground shadow */}
      <div className="pointer-events-none absolute inset-x-[8%] bottom-[-4%] h-16 rounded-[50%] bg-black/70 blur-2xl" />

      <motion.div
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative"
      >
        {/* Device shell */}
        <div className="relative rounded-[26px] border border-bone/15 bg-[linear-gradient(170deg,#242a2c_0%,#141819_38%,#0b0e0f_100%)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),inset_0_-2px_6px_rgba(0,0,0,0.8),0_60px_120px_-40px_rgba(0,0,0,1)] sm:p-3.5">
          {/* screws — seated in the shell padding */}
          {["left-0.5 top-0.5", "right-0.5 top-0.5", "left-0.5 bottom-0.5", "right-0.5 bottom-0.5"].map(
            (pos) => (
              <span
                key={pos}
                aria-hidden
                className={cn(
                  "pointer-events-none absolute z-20 flex h-[7px] w-[7px] items-center justify-center rounded-full bg-[#0a0d0e] ring-1 ring-inset ring-white/10",
                  pos,
                )}
              >
                <span className="h-[3px] w-[1px] rotate-45 bg-white/25" />
              </span>
            ),
          )}

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[15px] border border-black/70 bg-[#070a0b]">
            <div className="pointer-events-none absolute inset-0 z-30 opacity-[0.05] scanlines" />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30"
              style={reduced ? undefined : { background: glare }}
            />
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(115deg,rgba(255,255,255,0.05)_0%,transparent_28%,transparent_72%,rgba(255,255,255,0.025)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-bone/15" />

            {/* OS status bar */}
            <div className="relative z-10 flex items-center justify-between gap-4 border-b border-bone/10 bg-[#080c0d] px-3 py-2 sm:px-4">
              <div className="flex items-center gap-2.5">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-1 w-1 rounded-full bg-amber" />
                  <span className="h-1 w-1 rounded-full bg-amber/40" />
                  <span className="h-1 w-1 rounded-full bg-amber/15" />
                </span>
                <span className="label text-[8px] text-bone/45">
                  GUARD OS 4.2 · FIELD TERMINAL
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="label hidden text-[8px] text-amber/60 sm:block">LINK OK</span>
                <span className="label hidden text-[8px] text-bone/30 md:block">ARSENAL / MK IV</span>
                <span className="flex items-end gap-[2px]" aria-hidden>
                  {[3, 5, 7, 9].map((h, i) => (
                    <span
                      key={h}
                      className="w-[2px] bg-bone/40"
                      style={{ height: h, opacity: i === 3 ? 0.35 : 0.7 }}
                    />
                  ))}
                </span>
                <span className="flex h-3 w-6 items-center rounded-[2px] border border-bone/25 p-[1.5px]" aria-hidden>
                  <span className="h-full w-[72%] bg-amber/80" />
                </span>
              </div>
            </div>

            {/* Tab rail */}
            <div
              role="tablist"
              aria-label="Skill categories"
              className="relative z-10 flex gap-1 overflow-x-auto border-b border-bone/10 bg-[#080c0d] px-2 py-1.5 hide-scrollbar sm:px-3"
            >
              {arsenal.map((cat, i) => {
                const Icon = ICONS[cat.icon];
                const selected = tab === i;
                return (
                  <button
                    key={cat.id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`tab-${cat.id}`}
                    aria-selected={selected}
                    aria-controls={`panel-${cat.id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setTab(i)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={cn(
                      "group relative flex shrink-0 items-center gap-2 px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-[400ms] sm:px-3 sm:text-[9px]",
                      selected ? "text-amber" : "text-bone/35 hover:text-bone/70",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="whitespace-nowrap">{cat.label}</span>
                    <span
                      className={cn(
                        "ml-0.5 text-[8px] tabular",
                        selected ? "text-amber/50" : "text-bone/15",
                      )}
                    >
                      {String(cat.skills.length).padStart(2, "0")}
                    </span>
                    {selected ? (
                      <motion.span
                        layoutId="tab-underline"
                        className="absolute inset-x-1.5 bottom-0 h-px bg-amber"
                        transition={{ duration: 0.4, ease: ease.out }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Panel */}
            <div className="relative z-10 min-h-[420px] bg-[radial-gradient(120%_100%_at_50%_0%,#0c1112_0%,#070a0b_70%)] sm:min-h-[460px]">
              <div aria-hidden className="pointer-events-none absolute inset-0 hud-grid-fine opacity-40" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={category.id}
                  role="tabpanel"
                  id={`panel-${category.id}`}
                  aria-labelledby={`tab-${category.id}`}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: ease.out }}
                  className="relative grid grid-cols-1 gap-0 lg:grid-cols-[1.35fr_1fr]"
                >
                  {/* Skill diagnostics */}
                  <div className="border-b border-bone/10 px-3 py-4 sm:px-5 sm:py-5 lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between gap-4">
                      <span className="label text-[8px] text-bone/35">
                        {category.short} · SKILL DIAGNOSTICS
                      </span>
                      <span className="label text-[8px] text-amber/60">
                        {category.skills.length} MODULES
                      </span>
                    </div>

                    <p className="mt-2 text-[0.78rem] leading-relaxed text-fog-400">
                      {category.note}
                    </p>

                    <ul className="mt-4 space-y-[3px]">
                      {category.skills.map((skill, i) => (
                        <SkillRow key={skill.name} skill={skill} index={i} />
                      ))}
                    </ul>
                  </div>

                  {/* Readout column */}
                  <div className="px-3 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-center justify-between">
                      <span className="label text-[8px] text-bone/35">System readiness</span>
                      <span className="label flex items-center gap-1.5 text-[8px] text-amber/70">
                        <span className="h-1 w-1 animate-blink-soft rounded-full bg-amber" />
                        LIVE
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-5">
                      <RadialGauge value={category.readiness} />
                      <div className="flex-1 space-y-2.5">
                        {[
                          { k: "BUILD", v: "PASSING", tone: "amber" },
                          { k: "A11Y", v: "AA", tone: "muted" },
                          { k: "COVERAGE", v: "92%", tone: "muted" },
                        ].map((row) => (
                          <div
                            key={row.k}
                            className="flex items-center justify-between border-b border-bone/10 pb-1.5"
                          >
                            <span className="label text-[7px] text-bone/30">{row.k}</span>
                            <span
                              className={cn(
                                "font-mono text-[9px]",
                                row.tone === "amber" ? "text-amber/80" : "text-bone/55",
                              )}
                            >
                              {row.v}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Category readiness matrix */}
                    <div className="mt-5">
                      <span className="label text-[8px] text-bone/30">Cross-module load</span>
                      <div className="mt-2 flex h-14 items-end gap-1.5">
                        {arsenal.map((c, i) => (
                          <div key={c.id} className="flex flex-1 flex-col items-center gap-1.5">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${c.readiness * 0.44}px` }}
                              transition={{ duration: 0.7, delay: 0.05 * i, ease: ease.out }}
                              className={cn(
                                "w-full",
                                c.id === category.id ? "bg-amber/70" : "bg-bone/15",
                              )}
                            />
                            <span
                              className={cn(
                                "font-mono text-[7px]",
                                c.id === category.id ? "text-amber/70" : "text-bone/25",
                              )}
                            >
                              {c.short}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 border border-bone/10 bg-ink-950/40 p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="label text-[7px] text-bone/30">ACTIVE MODULE</span>
                        <span className="font-mono text-[8px] text-amber/70">
                          {category.short}-0{tab + 1}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1" aria-hidden>
                        {Array.from({ length: 28 }).map((_, i) => (
                          <span
                            key={i}
                            className="h-3 w-[2px]"
                            style={{
                              background:
                                i < 6 + tab * 3
                                  ? "rgba(227,164,61,0.7)"
                                  : "rgba(236,231,220,0.1)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* OS footer */}
            <div className="relative z-10 flex items-center justify-between gap-4 border-t border-bone/10 bg-[#080c0d] px-3 py-2 sm:px-4">
              <span className="label text-[8px] text-bone/25">
                ENV/GUARD · ARSENAL INDEX · REV 12
              </span>
              <div className="flex items-center gap-3">
                <span className="label hidden text-[8px] text-bone/20 sm:block">
                  TAP OR USE ← →
                </span>
                <span className="label text-[8px] text-amber/50">SYNCED</span>
              </div>
            </div>

            {/* CRT flicker */}
            <div className="pointer-events-none absolute inset-0 z-20 animate-flicker bg-[radial-gradient(120%_100%_at_50%_50%,transparent_60%,rgba(0,0,0,0.35)_100%)]" />
          </div>

          {/* Hardware chin */}
          <div className="relative mt-2 flex items-center justify-between gap-4 px-4 pb-0.5 pt-1">
            <span className="label text-[7px] tracking-[0.34em] text-bone/20">
              ENV/GUARD · FIELD UNIT 04
            </span>
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-1 w-1 rounded-full bg-amber/80" />
              <span className="h-1 w-1 rounded-full bg-signal/70" />
              <span className="h-1 w-1 rounded-full bg-bone/20" />
              <span className="h-1 w-1 rounded-full bg-bone/10" />
            </div>
          </div>
        </div>

        {/* Side hardware keys */}
        <div aria-hidden className="absolute -right-1 top-[22%] hidden h-16 w-[3px] rounded-r bg-bone/15 sm:block" />
        <div aria-hidden className="absolute -right-1 top-[38%] hidden h-10 w-[3px] rounded-r bg-bone/10 sm:block" />
        <div aria-hidden className="absolute -left-1 top-[30%] hidden h-24 w-[3px] rounded-l bg-bone/10 sm:block" />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SkillRow({
  skill,
  index,
}: {
  skill: SkillCategory["skills"][number];
  index: number;
}) {
  const reduced = useReducedMotion();

  return (
    <li className="group relative flex items-center gap-3 px-1.5 py-[7px] transition-colors duration-300 hover:bg-bone/[0.035]">
      <span className="w-4 shrink-0 font-mono text-[8px] tabular text-bone/20 group-hover:text-amber/60">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="w-[92px] shrink-0 truncate text-[0.78rem] text-bone/80 transition-colors group-hover:text-bone sm:w-[112px]">
        {skill.name}
      </span>
      <span className="flex-1">
        <span className="relative block h-[3px] w-full overflow-hidden bg-bone/10">
          <motion.span
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber/70 to-amber"
            initial={{ width: reduced ? `${skill.level}%` : 0 }}
            animate={{ width: `${skill.level}%` }}
            transition={{ duration: 0.9, delay: 0.04 * index, ease: ease.out }}
          />
        </span>
      </span>
      <span className="w-7 shrink-0 text-right font-mono text-[8px] tabular text-bone/35 group-hover:text-amber/80">
        {skill.level}
      </span>
      <span className="hidden w-11 shrink-0 text-right font-mono text-[7px] uppercase tracking-[0.1em] text-bone/20 sm:block">
        {skill.tag}
      </span>
    </li>
  );
}

function RadialGauge({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const radius = 52;
  const ticks = useMemo(() => Array.from({ length: 48 }), []);

  return (
    <div className="relative h-[152px] w-[152px] shrink-0">
      <svg viewBox="0 0 140 140" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(236,231,220,0.09)" strokeWidth="1" />
        <circle
          cx="70"
          cy="70"
          r={radius + 9}
          fill="none"
          stroke="rgba(236,231,220,0.05)"
          strokeWidth="1"
          strokeDasharray="1 9"
        />
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e3a43d"
          strokeWidth="2"
          strokeLinecap="butt"
          pathLength={100}
          strokeDasharray="100 100"
          transform="rotate(-90 70 70)"
          initial={{ strokeDashoffset: reduced ? 100 - value : 100 }}
          animate={{ strokeDashoffset: 100 - value }}
          transition={{ duration: 1.2, ease: ease.out }}
        />
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const r1 = radius - 7;
          const r2 = radius - (i % 4 === 0 ? 13 : 10);
          return (
            <line
              key={i}
              x1={70 + Math.cos(a) * r1}
              y1={70 + Math.sin(a) * r1}
              x2={70 + Math.cos(a) * r2}
              y2={70 + Math.sin(a) * r2}
              stroke={i / ticks.length <= value / 100 ? "rgba(227,164,61,0.45)" : "rgba(236,231,220,0.1)"}
              strokeWidth="0.8"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <motion.span
            key={value}
            initial={reduced ? undefined : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="display text-[2rem] leading-none text-bone"
          >
            {value}
          </motion.span>
          <span className="font-mono text-[10px] text-amber">%</span>
        </div>
        <span className="label mt-1.5 text-[7px] text-bone/30">READY</span>
      </div>
    </div>
  );
}
