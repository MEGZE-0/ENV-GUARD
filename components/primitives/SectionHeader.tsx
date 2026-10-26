import { Reveal } from "./Reveal";
import { cn } from "@/lib/utils";

type Props = {
  index: string;
  kicker: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  align?: "between" | "stacked";
};

export function SectionHeader({
  index,
  kicker,
  title,
  description,
  meta,
  className,
  align = "between",
}: Props) {
  return (
    <header className={cn("relative", className)}>
      <Reveal>
        <div className="flex items-center gap-3 border-t border-bone/10 pt-4">
          <span className="label label-amber tabular">[{index}]</span>
          <span className="label">{kicker}</span>
          <span className="ml-auto hidden items-center gap-2 sm:flex">
            <span className="h-1 w-1 animate-blink-soft rounded-full bg-amber" />
            <span className="label text-bone/30">{meta ?? "SECURE CHANNEL"}</span>
          </span>
        </div>
      </Reveal>

      <div
        className={cn(
          "mt-7 gap-x-16 gap-y-6",
          align === "between"
            ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end"
            : "flex flex-col",
        )}
      >
        <Reveal delay={0.06}>
          <h2 className="font-display text-display-md text-bone/95">{title}</h2>
        </Reveal>
        {description ? (
          <Reveal delay={0.14}>
            <p className="body-copy max-w-[46ch] lg:pb-1.5">{description}</p>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}
