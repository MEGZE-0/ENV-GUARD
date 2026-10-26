"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, ArrowUpRight, Github } from "lucide-react";
import type { Operation } from "@/data/site";
import { ease } from "@/lib/utils";
import { useBodyLock } from "@/lib/hooks";
import { ProjectVisual } from "./ProjectVisual";

export function OperationModal({
  operation,
  onClose,
}: {
  operation: Operation | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useBodyLock(Boolean(operation));

  useEffect(() => {
    if (!operation) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [operation, onClose]);

  return (
    <AnimatePresence>
      {operation ? (
        <motion.div
          className="fixed inset-0 z-[95] overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          data-lenis-prevent
        >
          <button
            type="button"
            aria-label="Close case file"
            tabIndex={-1}
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-ink-950/85 backdrop-blur-md"
          />

          <div className="relative flex min-h-full items-start justify-center px-3 py-6 sm:px-6 sm:py-10">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="case-title"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
              animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
              transition={{ duration: 0.55, ease: ease.out }}
              className="relative w-full max-w-5xl border border-bone/15 bg-ink-900 shadow-[0_60px_140px_-50px_rgba(0,0,0,1)]"
            >
              {/* Title bar */}
              <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-bone/10 bg-ink-900/95 px-4 py-3 backdrop-blur-md sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-1.5 w-1.5 shrink-0 animate-blink-soft rounded-full bg-amber" />
                  <span className="label truncate text-[9px] text-bone/45">
                    Case file · {operation.codename}
                  </span>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close case file"
                  className="flex h-8 w-8 shrink-0 items-center justify-center border border-bone/15 text-bone/60 transition-colors hover:border-amber/50 hover:text-amber"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Visual */}
              <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-bone/10">
                <ProjectVisual variant={operation.visual} />
              </div>

              <div className="grid grid-cols-1 gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:py-12">
                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="label text-amber/80">{operation.category}</span>
                    <span className="h-px w-6 bg-bone/20" />
                    <span className="label text-bone/30">{operation.year}</span>
                  </div>

                  <h2 id="case-title" className="display mt-4 text-display-md text-bone">
                    {operation.title}
                  </h2>
                  <p className="mt-4 max-w-[58ch] text-[0.95rem] leading-relaxed text-bone/75">
                    {operation.summary}
                  </p>

                  <div className="mt-9 space-y-7">
                    <Block label="Context" body={operation.caseStudy.context} />
                    <Block label="Problem" body={operation.caseStudy.problem} />

                    <div>
                      <span className="label text-bone/35">Approach</span>
                      <ol className="mt-3 space-y-3">
                        {operation.caseStudy.approach.map((item, i) => (
                          <li key={i} className="flex gap-4">
                            <span className="mt-0.5 font-mono text-[10px] text-amber/70">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[0.87rem] leading-relaxed text-fog-300">{item}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                <aside className="lg:col-span-5">
                  <div className="border border-bone/10 bg-ink-850/60 p-5">
                    <span className="label text-bone/35">Outcome</span>
                    <ul className="mt-4 space-y-3">
                      {operation.caseStudy.outcome.map((item, i) => (
                        <li key={i} className="flex gap-3 text-[0.85rem] leading-relaxed text-bone/80">
                          <span className="mt-[7px] h-1 w-1 shrink-0 bg-amber" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 grid grid-cols-3 gap-3 border-t border-bone/10 pt-5">
                      {operation.metrics.map((m) => (
                        <div key={m.label}>
                          <div className="display text-[1.2rem] leading-none text-amber">{m.value}</div>
                          <div className="label mt-1.5 text-[7px] leading-tight text-bone/30">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <span className="label text-bone/35">Stack</span>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {operation.stack.map((tech) => (
                        <li
                          key={tech}
                          className="border border-bone/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-bone/50"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-7 flex flex-col gap-2">
                    <a
                      href={operation.live}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex h-11 items-center justify-between border border-bone/15 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-bone/75 transition-colors hover:border-amber/50 hover:text-amber"
                    >
                      Live deployment
                      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                    <a
                      href={operation.code}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex h-11 items-center justify-between border border-bone/15 px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-bone/75 transition-colors hover:border-amber/50 hover:text-amber"
                    >
                      Source repository
                      <Github className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p className="mt-5 font-mono text-[9px] leading-relaxed text-bone/20">
                    Placeholder links. Replace with real deployment and repository URLs in
                    <span className="mx-1 text-bone/40">data/site.ts</span>.
                  </p>
                </aside>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <span className="label text-bone/35">{label}</span>
      <p className="mt-2.5 text-[0.87rem] leading-relaxed text-fog-300">{body}</p>
    </div>
  );
}
