import { HudButton } from "@/components/primitives/HudButton";

export default function NotFound() {
  return (
    <section className="relative flex min-h-[100svh] items-center overflow-hidden">
      <div aria-hidden className="absolute inset-0 hud-grid opacity-40" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_40%,rgba(227,164,61,0.06),transparent_70%)]"
      />
      <div className="shell relative py-32">
        <span className="label flex items-center gap-2 text-amber/80">
          <span className="h-1 w-1 animate-blink-soft rounded-full bg-alert" />
          Signal lost
        </span>
        <h1 className="display mt-6 text-display-lg text-bone">
          Coordinates
          <br />
          unreadable<span className="text-amber">.</span>
        </h1>
        <p className="body-copy mt-6 max-w-[42ch]">
          This sector doesn&apos;t exist — or it has been decommissioned. Return to the command
          interface and pick a known position.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <HudButton href="/">Return to base</HudButton>
          <HudButton href="/#operations" variant="outline">
            View operations
          </HudButton>
        </div>
        <div className="mt-16 flex items-center gap-4 border-t border-bone/10 pt-4">
          <span className="label text-bone/25">ERROR 404</span>
          <span className="h-px flex-1 bg-bone/10" />
          <span className="label text-bone/20">GRID REF · —</span>
        </div>
      </div>
    </section>
  );
}
