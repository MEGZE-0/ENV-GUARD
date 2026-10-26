"use client";

import { useEffect, useState } from "react";
import { Mark } from "./Wordmark";

const LINES = [
  "[SYS] MOUNTING SECURE SHELL",
  "[MAP] STREAMING TERRAIN TILES",
  "[NET] SYNCING LIVE TELEMETRY",
];

/**
 * A short, single-purpose boot sequence. Never longer than it needs to be,
 * and skipped entirely for reduced-motion users.
 */
export function Preloader() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("gone");
      return;
    }
    const out = window.setTimeout(() => setPhase("out"), 1000);
    const gone = window.setTimeout(() => setPhase("gone"), 1700);
    return () => {
      window.clearTimeout(out);
      window.clearTimeout(gone);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[90] flex flex-col justify-between overflow-hidden bg-ink-950 px-6 py-6 transition-transform duration-[700ms] ease-[cubic-bezier(0.76,0,0.24,1)] sm:px-10 sm:py-8"
      style={{ transform: phase === "out" ? "translateY(-101%)" : "translateY(0)" }}
    >
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-[0.5]" />
      <div className="relative flex items-center justify-between">
        <span className="label text-bone/30">ENV/GUARD · TERMINAL</span>
        <span className="label text-bone/30">BUILD 4.2.1</span>
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <div className="animate-flicker">
          <Mark className="h-12 w-12" />
        </div>
        <div className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-none tracking-[0.14em] text-bone">
          ENV/GUARD
        </div>
        <div className="w-[min(420px,78vw)]">
          <div className="relative h-px w-full overflow-hidden bg-bone/15">
            <span className="enter-bar absolute inset-0 h-px bg-amber" style={{ animationDuration: "1.2s" }} />
          </div>
          <div className="mt-3 flex justify-between">
            <span className="label text-bone/30">ESTABLISHING LINK</span>
            <span className="label text-amber/80">100%</span>
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5 sm:gap-2">
        {LINES.map((line, i) => (
          <span
            key={line}
            className="label enter-fade text-bone/25"
            style={{ animationDelay: `${0.18 + i * 0.22}s`, animationDuration: "0.9s" }}
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}
