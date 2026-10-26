import { cn } from "@/lib/utils";

/** Four machined corner ticks. Purely decorative. */
export function Brackets({
  className,
  size = 14,
  inset = 0,
  tone = "muted",
}: {
  className?: string;
  size?: number;
  /** Offset in px; negative values place the ticks outside the box. */
  inset?: number;
  tone?: "muted" | "amber" | "bone";
}) {
  const color =
    tone === "amber"
      ? "border-amber/60"
      : tone === "bone"
        ? "border-bone/40"
        : "border-bone/25";

  const style = { width: size, height: size } as const;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{ inset }}
    >
      <span className={cn("absolute left-0 top-0 border-l border-t", color)} style={style} />
      <span className={cn("absolute right-0 top-0 border-r border-t", color)} style={style} />
      <span className={cn("absolute bottom-0 left-0 border-b border-l", color)} style={style} />
      <span className={cn("absolute bottom-0 right-0 border-b border-r", color)} style={style} />
    </div>
  );
}
