"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { ease } from "@/lib/utils";

/**
 * Counts up to the numeric part of a display string on first view.
 * Prefix/suffix (e.g. "$", "%", "M") are preserved.
 */
export function Counter({
  value,
  className,
  duration = 1.5,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  const match = value.match(/-?\d+(?:\.\d+)?/);
  const target = match ? parseFloat(match[0]) : 0;
  const decimals = match && match[0].includes(".") ? match[0].split(".")[1].length : 0;
  const prefix = match ? value.slice(0, match.index) : "";
  const suffix = match ? value.slice((match.index ?? 0) + match[0].length) : "";

  useEffect(() => {
    if (!inView) return;
    if (reduced || !match) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, target, {
      duration,
      ease: ease.out,
      onUpdate: (v) => {
        setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, target]);

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden className="tabular">
        {display}
      </span>
    </span>
  );
}
