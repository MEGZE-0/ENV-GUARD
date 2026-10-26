"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

type Marker = {
  dx: number;
  dy: number;
  phase: number;
  kind: "hostile" | "signal";
  label?: string;
};

/** Radar-relative markers — hand-placed for composition, not random. */
const MARKERS: Marker[] = [
  { dx: -0.34, dy: -0.46, phase: 0.2, kind: "hostile", label: "SIG-01" },
  { dx: 0.28, dy: -0.58, phase: 1.1, kind: "signal" },
  { dx: 0.52, dy: -0.14, phase: 2.4, kind: "hostile", label: "SIG-04" },
  { dx: 0.1, dy: 0.18, phase: 0.7, kind: "signal" },
  { dx: -0.46, dy: 0.12, phase: 3.1, kind: "hostile" },
  { dx: 0.32, dy: 0.54, phase: 1.8, kind: "signal", label: "SIG-09" },
  { dx: -0.12, dy: -0.2, phase: 4.2, kind: "signal" },
  { dx: 0.66, dy: 0.3, phase: 2.9, kind: "signal" },
  { dx: -0.58, dy: -0.12, phase: 3.6, kind: "hostile" },
  { dx: 0.04, dy: 0.44, phase: 5.1, kind: "signal" },
];

const DUST = Array.from({ length: 44 }, (_, i) => {
  const r = (n: number) => {
    const v = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x: r(1),
    y: r(2),
    size: 0.5 + r(3) * 1.4,
    speed: 0.004 + r(4) * 0.012,
    drift: (r(5) - 0.5) * 0.02,
    phase: r(6) * Math.PI * 2,
  };
});

export function HeroScene() {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });

  // Pointer parallax — spring-damped, small amplitudes only.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const imageX = useSpring(px, { stiffness: 60, damping: 22, mass: 0.6 });
  const imageY = useSpring(py, { stiffness: 60, damping: 22, mass: 0.6 });
  const overlayX = useSpring(px, { stiffness: 90, damping: 26, mass: 0.5 });
  const overlayY = useSpring(py, { stiffness: 90, damping: 26, mass: 0.5 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      pointer.current = { x: nx, y: ny };
      if (reduced) return;
      px.set(nx * -26);
      py.set(ny * -18);
    };
    const onLeave = () => {
      px.set(0);
      py.set(0);
      pointer.current = { x: 0, y: 0 };
    };

    wrap.addEventListener("pointermove", onMove, { passive: true });
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [px, py, reduced]);

  // ------------------------------------------------------------------
  // Canvas: tactical grid, radar sweep, live markers, dust, data pulses.
  // ------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let last = 0;
    let time = 0;
    let running = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);
      const compact = width < 768;
      const { x: mx, y: my } = pointer.current;

      // --- tactical grid -------------------------------------------
      const cell = compact ? 64 : 104;
      const offX = (t * 5) % cell;
      const offY = (t * 2.5) % cell;
      ctx.lineWidth = 1;

      for (let x = -cell + offX; x < width + cell; x += cell) {
        ctx.strokeStyle = "rgba(236,231,220,0.037)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = -cell + offY; y < height + cell; y += cell) {
        ctx.strokeStyle = "rgba(236,231,220,0.033)";
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // --- radar ----------------------------------------------------
      const cx = width * (compact ? 0.58 : 0.665) + mx * 22;
      const cy = height * (compact ? 0.35 : 0.4) + my * 16;
      const R = compact
        ? Math.min(width * 0.52, height * 0.3)
        : Math.min(width * 0.33, height * 0.38);

      ctx.save();
      ctx.strokeStyle = "rgba(236,231,220,0.07)";
      ctx.setLineDash([1, 7]);
      [0.34, 0.67, 1].forEach((k) => {
        ctx.beginPath();
        ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.strokeStyle = "rgba(236,231,220,0.045)";
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R);
      ctx.lineTo(cx, cy + R);
      ctx.stroke();

      // cardinal ticks
      ctx.strokeStyle = "rgba(227,164,61,0.22)";
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const long = i % 9 === 0;
        const r1 = R * 1.035;
        const r2 = R * (long ? 1.075 : 1.055);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.globalAlpha = long ? 0.85 : 0.4;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // sweep
      const angle = (t * 0.34) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const wedge = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      wedge.addColorStop(0, "rgba(227,164,61,0.085)");
      wedge.addColorStop(0.65, "rgba(227,164,61,0.035)");
      wedge.addColorStop(1, "rgba(227,164,61,0)");
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.62, 0);
      ctx.closePath();
      ctx.fillStyle = wedge;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(R, 0);
      ctx.strokeStyle = "rgba(227,164,61,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // markers
      MARKERS.forEach((m) => {
        const x = cx + m.dx * R;
        const y = cy + m.dy * R;
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) return;
        const hostile = m.kind === "hostile";
        const rgb = hostile ? "200,68,58" : "227,164,61";
        const pulse = (Math.sin(t * 1.9 + m.phase) + 1) / 2;
        const period = 3.4;
        const age = ((t + m.phase * 1.6) % period) / period;

        ctx.beginPath();
        ctx.arc(x, y, 3 + age * 20, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},${(1 - age) * 0.36})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 2 + pulse * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${0.5 + pulse * 0.5})`;
        ctx.fill();

        if (hostile) {
          ctx.strokeStyle = `rgba(${rgb},${0.18 + pulse * 0.2})`;
          ctx.beginPath();
          ctx.moveTo(x - 8, y);
          ctx.lineTo(x - 4, y);
          ctx.moveTo(x + 4, y);
          ctx.lineTo(x + 8, y);
          ctx.moveTo(x, y - 8);
          ctx.lineTo(x, y - 4);
          ctx.moveTo(x, y + 4);
          ctx.lineTo(x, y + 8);
          ctx.stroke();
        }

        if (m.label && !compact) {
          ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = "rgba(236,231,220,0.34)";
          ctx.fillText(m.label, x + 11, y + 3);
        }
      });

      // --- travelling data pulses -----------------------------------
      for (let i = 0; i < 3; i++) {
        const y = height * (0.24 + i * 0.26);
        const p = ((t * (0.055 + i * 0.018) + i * 0.41) % 1.25) - 0.15;
        const x = p * width;
        const grad = ctx.createLinearGradient(x - 190, 0, x + 40, 0);
        grad.addColorStop(0, "rgba(227,164,61,0)");
        grad.addColorStop(0.75, "rgba(227,164,61,0.14)");
        grad.addColorStop(1, "rgba(227,164,61,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(x - 190, y, 230, 1);
        if (Math.sin(t * 1.2 + i) > 0.6) {
          ctx.fillStyle = "rgba(227,164,61,0.5)";
          ctx.fillRect(x + 38, y - 1, 1, 3);
        }
      }

      // --- scan band ------------------------------------------------
      const scanX = ((t * 0.028) % 1.25 - 0.12) * width;
      const scan = ctx.createLinearGradient(scanX - 120, 0, scanX + 120, 0);
      scan.addColorStop(0, "rgba(236,231,220,0)");
      scan.addColorStop(0.5, "rgba(236,231,220,0.028)");
      scan.addColorStop(1, "rgba(236,231,220,0)");
      ctx.fillStyle = scan;
      ctx.fillRect(scanX - 120, 0, 240, height);

      // --- dust -----------------------------------------------------
      DUST.forEach((d) => {
        const x = (((d.x + t * d.speed) % 1.06) * width);
        const y = d.y * height + Math.sin(t * 0.35 + d.phase) * 10;
        const a = 0.06 + 0.14 * ((Math.sin(t * 0.7 + d.phase) + 1) / 2);
        ctx.beginPath();
        ctx.arc(x, y, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,231,220,${a})`;
        ctx.fill();
      });
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!running) return;
      if (now - last < 1000 / 30) return;
      const dt = Math.min(now - last, 90);
      last = now;
      time += dt / 1000;
      draw(time);
    };

    const start = () => {
      if (reduced) {
        draw(0.6);
        return;
      }
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      running = !document.hidden;
    };

    const onResize = () => {
      resize();
      if (reduced) draw(0.6);
    };

    resize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-ink-950"
    >
      {/* Terrain plate */}
      <motion.div
        className="absolute -inset-[4%]"
        style={reduced ? undefined : { x: imageX, y: imageY }}
      >
        <div className="absolute inset-0 animate-drift-slow will-change-transform">
          <Image
            src="/media/ops-terrain.webp"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={82}
            className="object-cover object-[62%_45%] opacity-[0.72] saturate-[0.35] contrast-[1.08] brightness-[0.82]"
          />
        </div>
      </motion.div>

      {/* Grade: cool shadow, warm haze, filmic falloff */}
      <div className="absolute inset-0 bg-[radial-gradient(75%_55%_at_66%_40%,rgba(227,164,61,0.07),transparent_62%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,7,8,0.92)_0%,rgba(6,7,8,0.22)_26%,rgba(6,7,8,0.5)_64%,rgba(6,7,8,0.97)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,7,8,0.9)_0%,rgba(6,7,8,0.25)_38%,rgba(6,7,8,0.15)_70%,rgba(6,7,8,0.72)_100%)]" />
      <div className="absolute inset-0 vignette" />

      {/* Tactical overlay */}
      <motion.div
        className="absolute inset-0"
        style={reduced ? undefined : { x: overlayX, y: overlayY }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </motion.div>

      {/* Heavy fog drift */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] translate-y-1/4 bg-[radial-gradient(60%_100%_at_30%_100%,rgba(120,132,132,0.1),transparent_70%)] blur-2xl" />
      <div className="pointer-events-none absolute inset-x-0 top-1/3 h-[30%] animate-drift-slow bg-[radial-gradient(50%_80%_at_75%_50%,rgba(90,100,102,0.09),transparent_75%)] blur-3xl" />
    </div>
  );
}
