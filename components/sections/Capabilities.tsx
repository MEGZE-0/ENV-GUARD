import { ArrowUpRight } from "lucide-react";
import { capabilities } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { HudButton } from "@/components/primitives/HudButton";

export function Capabilities() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-title"
      className="relative border-t border-bone/10"
    >
      <div className="shell py-24 sm:py-32 lg:py-36">
        <SectionHeader
          index="05"
          kicker="Capabilities"
          title={
            <span id="capabilities-title">
              Deployment
              <br />
              options<span className="text-amber">.</span>
            </span>
          }
          description="Eight ways teams engage me. Most start with one and end up using three — the work tends to reveal the next problem worth solving."
          meta="8 CAPABILITIES"
        />

        <div className="mt-12 grid grid-cols-1 border-l border-t border-bone/10 sm:grid-cols-2 sm:mt-16 lg:grid-cols-4">
          {capabilities.map((cap) => (
            <Reveal key={cap.index} amount={0.15} className="h-full">
              <div className="group relative h-full overflow-hidden border-b border-r border-bone/10 p-5 transition-colors duration-700 hover:bg-ink-850/60 sm:p-6">
                {/* bottom fill sweep */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0 bg-gradient-to-t from-amber/[0.07] to-transparent transition-[height] duration-700 ease-tactical group-hover:h-full"
                />
                <div className="relative flex items-start justify-between">
                  <span className="font-mono text-[10px] text-amber/60 transition-colors duration-500 group-hover:text-amber">
                    {cap.index}
                  </span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 -translate-y-1 text-bone/15 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:text-amber/70 group-hover:opacity-100"
                    strokeWidth={1.5}
                  />
                </div>

                <h3 className="relative mt-8 text-[1.02rem] font-medium leading-snug tracking-[-0.01em] text-bone/90">
                  {cap.title}
                </h3>
                <p className="relative mt-2.5 text-[0.8rem] leading-relaxed text-fog-400">
                  {cap.copy}
                </p>

                <ul className="relative mt-5 flex flex-wrap gap-x-2 gap-y-1">
                  {cap.tags.map((tag) => (
                    <li
                      key={tag}
                      className="font-mono text-[8px] uppercase tracking-[0.12em] text-bone/25 transition-colors duration-500 group-hover:text-bone/40"
                    >
                      {tag}
                      <span className="ml-2 text-amber/25">/</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.05}>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 border border-bone/10 bg-ink-850/40 px-5 py-6 sm:flex-row sm:items-center sm:px-8">
            <div>
              <span className="label text-amber/70">Engagement</span>
              <p className="mt-2.5 max-w-[52ch] text-[0.95rem] leading-relaxed text-bone/75">
                Available for a focused build, a technical rescue, or an advisory seat.
                If the scope is unclear, a 30-minute call usually finds the real problem.
              </p>
            </div>
            <HudButton href="#contact" variant="outline" arrow="up-right" className="shrink-0">
              Start a mission
            </HudButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
