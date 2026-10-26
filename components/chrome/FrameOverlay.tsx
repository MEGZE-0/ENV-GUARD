"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Global cinematic treatment: film grain, faint scanlines, vignette,
 * a machined outer frame and a scroll-progress hairline.
 */
export function FrameOverlay() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[65] overflow-hidden">
        <div className="absolute inset-0 grain" />
        <div className="absolute inset-0 opacity-[0.045] scanlines" />
        <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_50%_0%,transparent_38%,rgba(3,4,5,0.62)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink-950/70 to-transparent" />
      </div>
      <ScrollProgress />
    </>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[75] h-[2px] origin-left bg-gradient-to-r from-amber-700 via-amber to-amber/40"
    />
  );
}
