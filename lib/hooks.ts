"use client";

import { useEffect } from "react";
import { useLenisInstance } from "@/components/providers/SmoothScroll";

/** Locks page scroll (smooth scroll included) while `active` is true. */
export function useBodyLock(active: boolean) {
  const lenis = useLenisInstance();

  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.body.style.overflow = previous;
      lenis?.start();
    };
  }, [active, lenis]);
}
