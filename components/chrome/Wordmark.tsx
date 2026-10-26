import { cn } from "@/lib/utils";
import { site } from "@/data/site";

/** Brand mark: a machined shield with a single amber slash. */
export function Mark({ className, tone = "amber" }: { className?: string; tone?: "amber" | "bone" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("h-7 w-7", className)}
    >
      <path
        d="M16 2.6 28.4 9v9.2c0 5.4-5.2 9.4-12.4 11.2C8.8 27.6 3.6 23.6 3.6 18.2V9L16 2.6Z"
        stroke={tone === "amber" ? "#e3a43d" : "#ece7dc"}
        strokeOpacity="0.7"
        strokeWidth="1"
      />
      <path d="M16 8v16" stroke="#ece7dc" strokeOpacity="0.22" strokeWidth="1" />
      <path
        d="M10 21.5 16 8l6 13.5"
        stroke={tone === "amber" ? "#e3a43d" : "#ece7dc"}
        strokeWidth="1.35"
        strokeLinejoin="bevel"
      />
      <circle cx="16" cy="17.6" r="1.5" fill={tone === "amber" ? "#e3a43d" : "#ece7dc"} />
    </svg>
  );
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("group flex items-center gap-2.5", className)}>
      <Mark className="h-[26px] w-[26px] transition-transform duration-700 ease-tactical group-hover:rotate-[8deg]" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[17px] tracking-[0.06em] text-bone">
          {site.brand}
        </span>
        {!compact ? (
          <span className="label mt-1 text-[8px] tracking-[0.3em] text-fog-500">
            Systems engineer
          </span>
        ) : null}
      </span>
    </span>
  );
}
