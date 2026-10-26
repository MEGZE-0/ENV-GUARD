"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { operations, type Operation, type OperationCategory } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { OperationCard } from "@/components/operations/OperationCard";
import { OperationModal } from "@/components/operations/OperationModal";
import { cn, ease } from "@/lib/utils";

const FILTERS: ("All" | OperationCategory)[] = [
  "All",
  "SaaS",
  "Web Apps",
  "AI & Data",
  "Tools",
  "Mobile",
];

export function Operations() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [active, setActive] = useState<Operation | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: operations.length };
    operations.forEach((o) => {
      map[o.category] = (map[o.category] ?? 0) + 1;
    });
    return map;
  }, []);

  const filtered = useMemo(
    () => (filter === "All" ? operations : operations.filter((o) => o.category === filter)),
    [filter],
  );

  const featured = filter === "All" ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  return (
    <section
      id="operations"
      aria-labelledby="operations-title"
      className="relative border-t border-bone/10 bg-ink-950"
    >
      <div className="shell py-24 sm:py-32 lg:py-36">
        <SectionHeader
          index="02"
          kicker="Featured operations"
          title={
            <span id="operations-title">
              Selected work,
              <br />
              declassified<span className="text-amber">.</span>
            </span>
          }
          description="Six systems that shipped and stayed shipped. Open any case file for the constraints, the decisions and the numbers that followed."
          meta="6 FILES · 2021—2026"
        />

        {/* Filter bar */}
        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-3 border-y border-bone/10 py-3 sm:mt-14">
            <span className="label mr-2 text-[9px] text-bone/25">Filter</span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter operations by category">
              {FILTERS.map((f) => {
                const activeTab = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={activeTab}
                    className={cn(
                      "group relative flex items-center gap-2 notch-sm border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] transition-colors duration-[400ms]",
                      activeTab
                        ? "border-amber/50 bg-amber/10 text-amber"
                        : "border-transparent text-bone/40 hover:border-bone/15 hover:text-bone/75",
                    )}
                  >
                    {f}
                    <span
                      className={cn(
                        "text-[8px] transition-colors",
                        activeTab ? "text-amber/60" : "text-bone/20",
                      )}
                    >
                      {String(counts[f] ?? 0).padStart(2, "0")}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="label ml-auto hidden text-[9px] text-bone/20 md:block">
              {String(filtered.length).padStart(2, "0")} results
            </span>
          </div>
        </Reveal>

        {/* Grid */}
        <div className="mt-8 flex flex-col gap-6 sm:mt-10">
          <AnimatePresence mode="popLayout">
            {featured ? (
              <OperationCard
                key={featured.id}
                operation={featured}
                index={operations.findIndex((o) => o.id === featured.id)}
                featured
                onOpen={() => setActive(featured)}
              />
            ) : null}
          </AnimatePresence>

          <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {rest.map((operation) => (
                <OperationCard
                  key={operation.id}
                  operation={operation}
                  index={operations.findIndex((o) => o.id === operation.id)}
                  onOpen={() => setActive(operation)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footnote */}
        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 pt-5">
            <span className="label text-[9px] text-bone/25">
              Case files include constraints and trade-offs · NDA-safe
            </span>
            <motion.span
              key={filter}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: ease.out }}
              className="label flex items-center gap-2 text-[9px] text-amber/60"
            >
              <span className="h-1 w-1 rounded-full bg-amber" />
              {filter === "All" ? "Full archive" : filter}
            </motion.span>
          </div>
        </Reveal>
      </div>

      <OperationModal operation={active} onClose={() => setActive(null)} />
    </section>
  );
}
