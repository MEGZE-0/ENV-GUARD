import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { SkillsTablet } from "@/components/tablet/SkillsTablet";

const specs = [
  { k: "Display", v: '11.4" · 2400p' },
  { k: "System", v: "GUARD OS 4.2" },
  { k: "Unit", v: "FIELD 04" },
  { k: "Status", v: "READY" },
];

export function Arsenal() {
  return (
    <section
      id="arsenal"
      aria-labelledby="arsenal-title"
      className="relative overflow-hidden border-t border-bone/10"
    >
      {/* ambient light behind device */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[46%] h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(227,164,61,0.07),transparent_70%)] blur-2xl"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 hud-grid opacity-[0.35]" />

      <div className="shell relative py-24 sm:py-32 lg:py-36">
        <SectionHeader
          index="03"
          kicker="Interactive arsenal"
          title={
            <span id="arsenal-title">
              The loadout,
              <br />
              field-tested<span className="text-amber">.</span>
            </span>
          }
          description="A live terminal, not a badge wall. Switch modules to inspect how each layer of the stack is actually used in production."
          meta="6 MODULES · 48 SYSTEMS"
        />

        <Reveal delay={0.08} amount={0.08}>
          <div className="mt-12 sm:mt-16">
            <SkillsTablet />
          </div>
        </Reveal>

        {/* Technical dimension row */}
        <Reveal delay={0.05}>
          <div className="mt-9 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-bone/10 pt-5">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {specs.map((s) => (
                <div key={s.k} className="flex items-baseline gap-2">
                  <span className="label text-[8px] text-bone/25">{s.k}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-bone/60">
                    {s.v}
                  </span>
                </div>
              ))}
            </div>
            <span className="label text-[8px] text-bone/20">
              Hover to tilt · ← → to switch module
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
