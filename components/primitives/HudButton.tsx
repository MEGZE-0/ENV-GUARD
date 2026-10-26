"use client";

import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "outline" | "ghost";
  size?: "md" | "sm";
  arrow?: "right" | "up-right" | "none";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  external?: boolean;
  ariaLabel?: string;
};

const base =
  "group relative inline-flex select-none items-center justify-center gap-3 overflow-hidden notch-sm font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-500 ease-tactical disabled:cursor-not-allowed disabled:opacity-50";

const sizes = {
  md: "h-[52px] px-7",
  sm: "h-[42px] px-5 text-[10px]",
};

export function HudButton({
  children,
  href,
  onClick,
  variant = "solid",
  size = "md",
  arrow = "right",
  className,
  type = "button",
  disabled,
  external,
  ariaLabel,
}: Props) {
  const inner = (
    <>
      {/* hover wash */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 origin-bottom scale-y-0 transition-transform duration-500 ease-tactical group-hover:scale-y-100",
          variant === "solid" ? "bg-bone" : "bg-amber",
        )}
      />
      <span
        className={cn(
          "relative z-10 flex items-center gap-3 transition-colors duration-500",
          variant === "solid" && "text-ink-950 group-hover:text-ink-950",
          variant === "outline" && "text-bone/80 group-hover:text-ink-950",
          variant === "ghost" && "text-bone/60 group-hover:text-ink-950",
        )}
      >
        <span>{children}</span>
        {arrow === "right" ? (
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-500 ease-tactical group-hover:translate-x-1"
            strokeWidth={1.6}
          />
        ) : null}
        {arrow === "up-right" ? (
          <ArrowUpRight
            className="h-3.5 w-3.5 transition-transform duration-500 ease-tactical group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            strokeWidth={1.6}
          />
        ) : null}
      </span>
    </>
  );

  const styles = cn(
    base,
    sizes[size],
    variant === "solid" && "bg-amber text-ink-950 hover:text-ink-950",
    variant === "outline" && "border border-bone/20 text-bone/80 hover:border-amber",
    variant === "ghost" && "text-bone/60 hover:text-ink-950",
    className,
  );

  if (href) {
    const isHash = href.startsWith("#");
    if (isHash) {
      return (
        <a href={href} className={styles} aria-label={ariaLabel} onClick={onClick}>
          {inner}
        </a>
      );
    }
    return (
      <Link
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        className={styles}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={styles} disabled={disabled} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}
