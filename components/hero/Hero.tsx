import { heroStats, site } from "@/data/site";
import { Counter } from "@/components/primitives/Counter";
import { HudButton } from "@/components/primitives/HudButton";
import { Ticker } from "@/components/primitives/Ticker";
import { HeroScene } from "./HeroScene";

const statusFeed = [
  "SYS · NOMINAL",
  "API P95 · 42MS",
  "UPLINK · ENCRYPTED",
  "BUILD 4.2.1",
  "SECTOR EU-CENTRAL",
  "DEPLOY FREQ · 14/DAY",
  "UPTIME · 99.98%",
  "THREAT LEVEL · LOW",
];

export function Hero() {
  return (
    <section
      id="top"
      aria-label="Introduction"
      className="relative isolate min-h-[100svh] w-full overflow-hidden"
    >
      <HeroScene />

      <div className="relative z-10 flex min-h-[100svh] flex-col">
        {/* Top HUD row */}
        <div className="shell pt-[96px] sm:pt-[112px]">
          <div
            className="enter-fade flex items-start justify-between gap-6"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="flex flex-col gap-2">
              <span className="label flex items-center gap-2 text-amber/85">
                <span className="h-1 w-1 animate-blink-soft bg-amber" />
                Live operations map
              </span>
              <span className="label text-[9px] text-bone/30">
                31°14&apos;22&quot;N&nbsp;&nbsp;32°18&apos;07&quot;E
              </span>
            </div>

            <div className="hidden flex-col items-end gap-2.5 md:flex">
              <span className="label text-[9px] text-bone/30">Uplink stable</span>
              <div className="flex h-4 items-end gap-[3px]" aria-hidden>
                {[6, 10, 7, 14, 11, 16, 9, 13, 6, 11].map((h, i) => (
                  <span
                    key={i}
                    className="w-[2px] animate-blink-soft bg-amber/60"
                    style={{
                      height: h,
                      animationDelay: `${i * 0.16}s`,
                      animationDuration: `${2.4 + (i % 3) * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Focal reticle — decorative, sits over the radar centre */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[62%] top-[36%] hidden -translate-x-1/2 -translate-y-1/2 md:block lg:left-[66%] lg:top-[40%]">
          <div className="relative h-[132px] w-[132px] animate-flicker">
            <span className="absolute left-0 top-0 h-4 w-px bg-amber/40" />
            <span className="absolute left-0 top-0 h-px w-4 bg-amber/40" />
            <span className="absolute right-0 top-0 h-4 w-px bg-amber/40" />
            <span className="absolute right-0 top-0 h-px w-4 bg-amber/40" />
            <span className="absolute bottom-0 left-0 h-4 w-px bg-amber/40" />
            <span className="absolute bottom-0 left-0 h-px w-4 bg-amber/40" />
            <span className="absolute bottom-0 right-0 h-4 w-px bg-amber/40" />
            <span className="absolute bottom-0 right-0 h-px w-4 bg-amber/40" />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-alert" />
            <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-alert/25" />
            <span className="absolute -right-24 top-1/2 hidden -translate-y-1/2 items-center gap-2 lg:flex">
              <span className="h-px w-6 bg-amber/30" />
              <span className="label text-[8px] whitespace-nowrap text-bone/35">
                Primary AO · 4.2KM
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Headline + positioning */}
        <div className="shell pb-8 sm:pb-10">
          <div className="grid gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-12">
            <div className="lg:col-span-8">
              <div
                className="enter-rise flex items-center gap-3"
                style={{ animationDelay: "1.02s" }}
              >
                <span className="h-px w-8 bg-amber/80 sm:w-12" />
                <span className="label text-bone/55">
                  {site.name} · {site.role}
                </span>
              </div>

              <h1 className="mt-5 display text-display-xl text-bone">
                <span className="block overflow-hidden">
                  <span
                    className="enter-mask block"
                    style={{ animationDelay: "1.12s" }}
                  >
                    Systems that
                  </span>
                </span>
                <span className="block overflow-hidden">
                  <span
                    className="enter-mask block"
                    style={{ animationDelay: "1.24s" }}
                  >
                    Hold the <span className="text-ghost">line</span>
                    <span className="text-amber">.</span>
                  </span>
                </span>
              </h1>

              <div
                className="enter-line mt-7 h-px w-full max-w-2xl bg-bone/15"
                style={{ animationDelay: "1.5s" }}
              />
            </div>

            <div className="lg:col-span-4 lg:pb-2">
              <p
                className="enter-rise body-copy max-w-[40ch] text-bone/70"
                style={{ animationDelay: "1.42s" }}
              >
                I design and ship resilient web products — SaaS platforms, real-time
                systems and interfaces that stay fast when the load arrives. Ten years,
                forty-eight deployments, no missed launches.
              </p>

              <div
                className="enter-rise mt-7 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "1.55s" }}
              >
                <HudButton href="#operations" variant="solid">
                  View operations
                </HudButton>
                <HudButton href="#brief" variant="outline">
                  Read the brief
                </HudButton>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div
            className="enter-rise mt-11 grid grid-cols-2 gap-y-7 border-t border-bone/10 pt-6 sm:grid-cols-4"
            style={{ animationDelay: "1.68s" }}
          >
            {heroStats.map((stat, i) => (
              <div
                key={stat.label}
                className={
                  "flex flex-col gap-1.5 " +
                  (i > 0 ? "sm:border-l sm:border-bone/10 sm:pl-6" : "")
                }
              >
                <span className="flex items-baseline gap-1">
                  <span className="display text-[clamp(1.75rem,2.6vw,2.4rem)] leading-none text-bone">
                    <Counter value={stat.value} />
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.1em] text-amber">
                    {stat.suffix}
                  </span>
                </span>
                <span className="label text-[9px] text-bone/35">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status feed */}
        <div className="relative border-t border-bone/10 bg-ink-950/45 py-3 backdrop-blur-[2px]">
          <Ticker items={statusFeed} speed={52} />
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden
        className="absolute bottom-[118px] right-5 z-10 hidden flex-col items-center gap-4 lg:flex"
      >
        <span className="label rotate-180 text-[9px] text-bone/30 [writing-mode:vertical-rl]">
          Scroll to advance
        </span>
        <span className="relative block h-16 w-px overflow-hidden bg-bone/15">
          <span className="absolute inset-x-0 top-0 h-5 animate-cue bg-amber/80" />
        </span>
      </div>
    </section>
  );
}
