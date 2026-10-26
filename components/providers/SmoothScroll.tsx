"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";

const LenisContext = createContext<{ lenis: Lenis | null }>({ lenis: null });

/**
 * Global smooth scrolling with an anchor-aware API.
 * Disabled entirely when the user prefers reduced motion.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const instance = new Lenis({
      lerp: 0.105,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      anchors: { offset: -84 },
      autoRaf: false,
    });

    setLenis(instance);

    const raf = (time: number) => {
      instance.raf(time);
      frame.current = requestAnimationFrame(raf);
    };
    frame.current = requestAnimationFrame(raf);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={{ lenis }}>{children}</LenisContext.Provider>;
}

export function useSmoothScroll() {
  const { lenis } = useContext(LenisContext);

  return (target: string) => {
    const el = document.querySelector(target);
    if (!el) return;
    if (lenis) {
      lenis.scrollTo(el as HTMLElement, { offset: -84, duration: 1.2 });
    } else {
      (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}

export function useLenisInstance() {
  return useContext(LenisContext).lenis;
}
