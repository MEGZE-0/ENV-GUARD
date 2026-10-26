"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, ShieldCheck } from "lucide-react";
import { serviceScopes, site, socials } from "@/data/site";
import { SectionHeader } from "@/components/primitives/SectionHeader";
import { Reveal } from "@/components/primitives/Reveal";
import { HudButton } from "@/components/primitives/HudButton";
import { cn, ease } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";

const details = [
  { k: "Location", v: site.location },
  { k: "Availability", v: site.availability },
  { k: "Response", v: "Under 24 hours" },
  { k: "Engagement", v: "Contract · advisory" },
];

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [scope, setScope] = useState<string>(serviceScopes[0]);
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [messageLength, setMessageLength] = useState(0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setError(null);

    try {
      const response = await fetch("/api/transmission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          scope,
          message: data.get("message"),
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        setStatus("error");
        setError(
          Object.values(result.fields ?? {})[0] ?? result.error ?? "Transmission failed.",
        );
        return;
      }

      setReference(result.reference ?? "TX-000000");
      setStatus("sent");
      form.reset();
      setMessageLength(0);
    } catch {
      setStatus("error");
      setError("Channel unavailable. Email me directly at " + site.email);
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="relative overflow-hidden border-t border-bone/10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_100%,rgba(227,164,61,0.07),transparent_70%)]"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 hud-grid opacity-25" />

      <div className="shell relative py-24 sm:py-32 lg:py-40">
        <SectionHeader
          index="06"
          kicker="Final transmission"
          title={
            <span id="contact-title">
              Open
              <br />
              channel<span className="text-amber">.</span>
            </span>
          }
          description="Tell me what you're building and where it hurts. If I'm not the right fit, I'll say so and point you somewhere better."
          meta="CHANNEL SECURE"
        />

        <div className="mt-14 grid grid-cols-1 gap-10 lg:mt-20 lg:grid-cols-12 lg:gap-14">
          {/* Channels */}
          <div className="lg:col-span-5">
            <Reveal>
              <span className="label text-bone/30">Direct line</span>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={`mailto:${site.email}`}
                  className="link-line display text-[clamp(1.55rem,3.4vw,2.5rem)] leading-none text-bone transition-colors hover:text-amber"
                >
                  {site.email}
                </a>
                <button
                  type="button"
                  onClick={copyEmail}
                  aria-label="Copy email address"
                  className="flex h-8 w-8 shrink-0 items-center justify-center border border-bone/15 text-bone/45 transition-colors hover:border-amber/50 hover:text-amber"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <span className="label mt-3 flex items-center gap-2 text-[8px] text-bone/25" aria-live="polite">
                {copied ? (
                  <>
                    <span className="h-1 w-1 rounded-full bg-signal" /> Address copied to clipboard
                  </>
                ) : (
                  "Click to copy · replies within one business day"
                )}
              </span>
            </Reveal>

            <Reveal delay={0.06}>
              <ul className="mt-10 border-t border-bone/10">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-center justify-between gap-4 border-b border-bone/10 py-4 transition-colors"
                    >
                      <span className="flex items-center gap-4">
                        <span className="label w-16 text-[8px] text-bone/30">{social.label}</span>
                        <span className="font-mono text-[11px] text-bone/65 transition-colors group-hover:text-amber">
                          {social.handle}
                        </span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-bone/25 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber" />
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5">
                {details.map((d) => (
                  <div key={d.k}>
                    <span className="label text-[8px] text-bone/25">{d.k}</span>
                    <p className="mt-1.5 text-[0.84rem] text-bone/75">{d.v}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-10 flex items-center gap-3 border border-bone/10 bg-ink-850/40 px-4 py-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber/70" strokeWidth={1.4} />
                <p className="text-[0.76rem] leading-relaxed text-bone/45">
                  NDA-friendly. Nothing you send here is shared, indexed or fed to a model.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Composer */}
          <Reveal className="lg:col-span-7" delay={0.08} amount={0.12}>
            <div className="relative border border-bone/15 bg-ink-900/80">
              {/* header */}
              <div className="flex items-center justify-between gap-4 border-b border-bone/10 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 animate-blink-soft rounded-full bg-amber" />
                  <span className="label text-[9px] text-bone/45">Transmission composer</span>
                </div>
                <span className="label text-[8px] text-bone/20">AES-256 · TLS 1.3</span>
              </div>

              <div className="relative p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {status === "sent" ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: ease.out }}
                      className="flex min-h-[380px] flex-col justify-center"
                      aria-live="polite"
                    >
                      <span className="flex h-12 w-12 items-center justify-center border border-amber/40 bg-amber/[0.07] text-amber">
                        <Check className="h-5 w-5" />
                      </span>
                      <h3 className="display mt-6 text-[1.8rem] leading-none text-bone">
                        Transmission received
                      </h3>
                      <p className="mt-3 max-w-[42ch] text-[0.88rem] leading-relaxed text-fog-400">
                        Brief logged and routed. You&apos;ll get a reply at the return channel you
                        provided, usually the same day.
                      </p>

                      <dl className="mt-7 max-w-md space-y-2 border-t border-bone/10 pt-5 font-mono text-[10px] uppercase tracking-[0.12em]">
                        {[
                          ["Reference", reference],
                          ["Scope", scope],
                          ["Status", "Queued for review"],
                          ["ETA", "Under 24 hours"],
                        ].map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <dt className="text-bone/25">{k}</dt>
                            <dd className={k === "Status" ? "text-amber/80" : "text-bone/60"}>{v}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-8">
                        <HudButton variant="outline" onClick={() => setStatus("idle")} arrow="right">
                          New transmission
                        </HudButton>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      onSubmit={onSubmit}
                      initial={false}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                      noValidate={false}
                    >
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <Field label="Callsign / Name" htmlFor="name" index="01">
                          <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            autoComplete="name"
                            placeholder="Your name"
                            className="mt-2 w-full border-b border-bone/15 bg-transparent pb-2.5 text-[0.92rem] text-bone outline-none transition-colors caret-amber placeholder:text-bone/20 focus:border-amber"
                          />
                        </Field>
                        <Field label="Return channel / Email" htmlFor="email" index="02">
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="you@company.com"
                            className="mt-2 w-full border-b border-bone/15 bg-transparent pb-2.5 text-[0.92rem] text-bone outline-none transition-colors caret-amber placeholder:text-bone/20 focus:border-amber"
                          />
                        </Field>
                      </div>

                      <fieldset>
                        <legend className="label flex items-center gap-2 text-[8px] text-bone/30">
                          <span className="text-amber/50">03</span> Engagement type
                        </legend>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {serviceScopes.map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setScope(option)}
                              aria-pressed={scope === option}
                              className={cn(
                                "notch-sm border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors duration-500",
                                scope === option
                                  ? "border-amber/50 bg-amber/10 text-amber"
                                  : "border-bone/15 text-bone/40 hover:border-bone/25 hover:text-bone/70",
                              )}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </fieldset>

                      <Field label="Payload / Brief" htmlFor="message" index="04">
                        <textarea
                          id="message"
                          name="message"
                          required
                          rows={5}
                          maxLength={2000}
                          onChange={(e) => setMessageLength(e.target.value.length)}
                          placeholder="What are you building, what's the deadline, and what's currently in the way?"
                          className="mt-2 w-full resize-y border-b border-bone/15 bg-transparent pb-2.5 text-[0.92rem] leading-relaxed text-bone outline-none transition-colors caret-amber placeholder:text-bone/20 focus:border-amber"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="label text-[7.5px] text-bone/20">
                            Minimum 12 characters
                          </span>
                          <span className="font-mono text-[8px] tabular text-bone/25">
                            {String(messageLength).padStart(3, "0")} / 2000
                          </span>
                        </div>
                      </Field>

                      <div aria-live="polite">
                        {error ? (
                          <p className="border border-alert/30 bg-alert/[0.06] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-alert">
                            {error}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-bone/10 pt-5">
                        <span className="label text-[8px] text-bone/20">
                          {status === "sending" ? "ENCRYPTING PAYLOAD…" : "NO NEWSLETTER · NO FUNNEL"}
                        </span>
                        <HudButton
                          type="submit"
                          variant="solid"
                          disabled={status === "sending"}
                          arrow="up-right"
                        >
                          {status === "sending" ? "Transmitting" : "Transmit message"}
                        </HudButton>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* footer strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bone/10 px-4 py-2.5 sm:px-5">
                <span className="label text-[7.5px] text-bone/20">ENV/GUARD · COMMS TERMINAL</span>
                <div className="flex items-center gap-3">
                  <span className="label text-[7.5px] text-bone/20">UPLINK</span>
                  <span className="flex items-end gap-[2px]" aria-hidden>
                    {[4, 6, 8, 11, 13].map((h, i) => (
                      <span
                        key={h}
                        className="w-[2px] animate-blink-soft bg-amber/50"
                        style={{ height: h, animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  index,
  children,
}: {
  label: string;
  htmlFor: string;
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label flex items-center gap-2 text-[8px] text-bone/30">
        <span className="text-amber/50">{index}</span> {label}
      </label>
      {children}
    </div>
  );
}
