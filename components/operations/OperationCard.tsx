"use client";

import { ArrowUpRight, ArrowRight, Github } from "lucide-react";
import { motion } from "framer-motion";
import type { Operation } from "@/data/site";
import { cn, ease } from "@/lib/utils";
import { ProjectVisual } from "./ProjectVisual";

export function OperationCard({
  operation,
  index,
  featured = false,
  onOpen,
}: {
  operation: Operation;
  index: number;
  featured?: boolean;
  onOpen: () => void;
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.6, ease: ease.out, layout: { duration: 0.5, ease: ease.out } }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden border border-bone/10 bg-ink-850/70 transition-[border-color,box-shadow,transform] duration-700 ease-tactical hover:border-amber/30 hover:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)]",
        featured && "lg:grid lg:grid-cols-12 lg:min-h-[430px]",
      )}
    >
      {/* hover spotlight */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--mx, 50%) var(--my, 0%), rgba(227,164,61,0.07), transparent 65%)",
        }}
      />

      {/* Visual */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open case file: ${operation.title}`}
        className={cn(
          "relative block w-full overflow-hidden border-b border-bone/10 text-left focus-visible:outline-offset-[-3px]",
          featured ? "lg:col-span-7 lg:border-b-0 lg:border-r" : "aspect-[16/10]",
        )}
      >
        <div className={cn("relative h-full w-full", !featured && "absolute inset-0")}>
          <ProjectVisual variant={operation.visual} />
        </div>

        {/* top annotation */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3.5">
          <span className="label flex items-center gap-2 bg-ink-950/55 px-2 py-1 text-[8px] text-bone/60 backdrop-blur-sm">
            <span className="h-1 w-1 rounded-full bg-alert" />
            {operation.codename}
          </span>
          <span className="label bg-ink-950/55 px-2 py-1 text-[8px] text-bone/40 backdrop-blur-sm">
            {operation.year}
          </span>
        </div>

        {/* hover reveal */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-between gap-4 bg-[linear-gradient(180deg,transparent_45%,rgba(5,6,7,0.88)_100%)] p-4 opacity-0 transition-opacity duration-500 ease-tactical group-hover:opacity-100">
          <span className="label flex items-center gap-2 text-[9px] text-bone">
            <span className="h-px w-6 bg-amber" />
            Open case file
          </span>
          <span className="flex h-8 w-8 items-center justify-center border border-amber/40 text-amber">
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>

        {/* amber edge sweep */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-amber/70 transition-transform duration-700 ease-tactical group-hover:scale-x-100" />
      </button>

      {/* Copy */}
      <div
        className={cn(
          "flex flex-1 flex-col",
          featured ? "p-6 sm:p-8 lg:col-span-5 lg:justify-center" : "p-5 sm:p-6",
        )}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-amber/80">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="h-px w-5 bg-bone/15" />
          <span className="label text-[9px] text-bone/35">{operation.category}</span>
          {featured ? (
            <span className="ml-auto border border-amber/35 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-amber/80">
              Priority file
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "display mt-3 leading-[0.95] text-bone transition-colors duration-500 group-hover:text-amber",
            featured ? "text-[clamp(1.9rem,2.6vw,2.6rem)]" : "text-[1.5rem] sm:text-[1.7rem]",
          )}
        >
          <button type="button" onClick={onOpen} className="text-left">
            {operation.title}
          </button>
        </h3>

        <p
          className={cn(
            "mt-3 text-[0.86rem] leading-relaxed text-fog-400",
            featured ? "max-w-[46ch] sm:text-[0.92rem]" : "line-clamp-3",
          )}
        >
          {operation.summary}
        </p>

        <ul className="mt-4 flex flex-wrap gap-1.5">
          {operation.stack.slice(0, featured ? 6 : 4).map((tech) => (
            <li
              key={tech}
              className="border border-bone/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-bone/45"
            >
              {tech}
            </li>
          ))}
          {operation.stack.length > (featured ? 6 : 4) ? (
            <li className="px-1 py-1 font-mono text-[9px] text-bone/25">
              +{operation.stack.length - (featured ? 6 : 4)}
            </li>
          ) : null}
        </ul>

        {featured ? (
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-bone/10 pt-5">
            {operation.metrics.map((m) => (
              <div key={m.label}>
                <div className="display text-[1.35rem] leading-none text-bone">{m.value}</div>
                <div className="label mt-1.5 text-[8px] text-bone/30">{m.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div
          className={cn(
            "mt-5 flex items-center justify-between gap-4 border-t border-bone/10 pt-4",
            featured && "mt-6",
          )}
        >
          <div className="flex items-center gap-4">
            <a
              href={operation.live}
              target="_blank"
              rel="noreferrer noopener"
              className="group/link flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-bone/55 transition-colors hover:text-amber"
            >
              Live
              <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5" />
            </a>
            <a
              href={operation.code}
              target="_blank"
              rel="noreferrer noopener"
              className="group/link flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-bone/55 transition-colors hover:text-amber"
            >
              <Github className="h-3 w-3" />
              Code
            </a>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="group/open flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-amber/80 transition-colors hover:text-amber"
          >
            Case file
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover/open:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
