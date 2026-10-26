import { cn } from "@/lib/utils";

/** Endless status marquee. Pauses on hover, static under reduced motion. */
export function Ticker({
  items,
  className,
  speed = 48,
}: {
  items: string[];
  className?: string;
  speed?: number;
}) {
  const row = [...items, ...items];

  return (
    <div className={cn("group relative overflow-hidden mask-fade-x", className)} aria-hidden>
      <div
        className="flex w-max animate-ticker items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${speed}s` }}
      >
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center">
            <span className="label whitespace-nowrap text-bone/35">{item}</span>
            <span className="mx-6 inline-block h-1 w-1 rotate-45 bg-amber/60" />
          </span>
        ))}
      </div>
    </div>
  );
}
