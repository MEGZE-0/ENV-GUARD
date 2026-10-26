# ENV/GUARD — tactical portfolio for a full-stack engineer

A cinematic, single-page portfolio built as a **live command interface**: an animated
operations map, declassified case files, an interactive field tablet for the skills
stack, a deployment record, and a transmission terminal for contact.

Not a game fan page — a restrained, editorial, production-ready site with one accent
colour, real information hierarchy and motion that communicates rather than decorates.

---

## Stack

| Layer      | Choice                                                   |
| ---------- | -------------------------------------------------------- |
| Framework  | Next.js 15 (App Router, React 19)                        |
| Language   | TypeScript (strict)                                      |
| Styling    | Tailwind CSS 3 + a small design-token layer in `globals.css` |
| Motion     | Framer Motion 12 (reveals, layout, modal, springs)       |
| Canvas     | Hand-written 2D canvas for the hero radar / grid / dust   |
| Smoothing  | Lenis                                                    |
| Icons      | lucide-react                                             |
| Type       | Barlow Condensed (display), Inter (body), JetBrains Mono (HUD) — self-hosted via Fontsource |

No UI kit, no template sections. Every surface is purpose-built for this identity.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start
npm run typecheck  # tsc --noEmit
```

---

## Sections

| #    | Section          | Component                                   |
| ---- | ---------------- | ------------------------------------------- |
| —    | Hero / live ops  | `components/hero/Hero.tsx` + `HeroScene.tsx` |
| 01   | Mission brief    | `components/sections/About.tsx`             |
| 02   | Operations       | `components/sections/Operations.tsx`        |
| 03   | Arsenal (tablet) | `components/sections/Arsenal.tsx`           |
| 04   | Deployment record| `components/sections/Timeline.tsx`          |
| 05   | Capabilities     | `components/sections/Capabilities.tsx`      |
| 05B  | Signal intel     | `components/sections/Testimonials.tsx`      |
| 06   | Final transmission | `components/sections/Contact.tsx`         |
| —    | Footer           | `components/sections/Footer.tsx`            |

### The hero scene
Three composited layers over a graded aerial plate:

1. **Plate** — `next/image` (priority), slow 32s drift, pointer parallax via springs.
2. **Canvas** — 30 fps-capped tactical grid, rotating radar sweep, hand-placed
   hostile/signal markers with expanding ping rings, travelling data pulses, dust.
3. **HUD** — coordinates, uplink bars, focal reticle, scroll cue, status ticker.

The canvas pauses when the tab is hidden, downscales DPR to 1.6, and renders a single
static frame under `prefers-reduced-motion`.

### The skills tablet
A rugged field terminal, not a badge grid:

- pointer-driven 3D tilt with a moving glass glare (`useMotionTemplate`)
- six tab modules with proper `tablist` semantics and ←/→/Home/End keys
- animated skill bars, radial readiness gauge, cross-module load chart
- OS chrome: status bar, battery, scanlines, CRT flicker, hardware keys

### Operations
- filter tabs with counts, FLIP layout animation (`AnimatePresence mode="popLayout"`)
- the first card becomes a featured 12-column layout when no filter is active
- each card opens a **case file modal** (context / problem / approach / outcome /
  metrics / stack / links) with focus handling, ESC-to-close and a scroll lock
- interface plates are authored SVGs (`components/operations/ProjectVisual.tsx`) —
  sharp at any size, ~a few kB each, perfectly on-brand

### Contact
- a real API route: `POST /api/transmission` validates and returns a reference
- composer with scope selection, character count, `aria-live` errors, and a
  transmission-receipt state
- copy-to-clipboard on the email address

---

## Where to replace content

**Everything textual lives in `data/site.ts`.** No copy is hard-coded inside sections
except structural labels (e.g. "Filter").

| What                    | Where                                              |
| ----------------------- | -------------------------------------------------- |
| Name, brand, role, email, availability, version | `site`                     |
| Navigation items        | `nav`                                              |
| Hero stats              | `heroStats`                                        |
| About copy, facts, principles, mission | `about`                                 |
| Projects + case studies | `operations` (add/remove freely; filters + counts adapt) |
| Skills + levels         | `arsenal`                                          |
| Experience log          | `experience`                                       |
| Services                | `capabilities`                                     |
| Testimonials, proof metrics | `testimonials`, `proofMetrics`                 |
| Social links, scopes    | `socials`, `serviceScopes`                         |

### Images (replace these)

| File                          | Used for                | Recommended source                        |
| ----------------------------- | ----------------------- | ----------------------------------------- |
| `public/media/ops-terrain.webp` | Hero satellite plate   | 2400×1400 aerial/satellite still, dark, desaturated. Or keep the generated one. |
| `public/media/portrait.webp`    | Mission brief portrait | 1200×1500 editorial portrait, low-key lighting |
| `public/media/topo.webp`        | Optional texture        | topo/contour map for section backgrounds   |
| `public/favicon.svg`            | Favicon                 | swap the monogram for your own mark        |

Aim for WebP/AVIF, ≤ 200 kB each. Keep the hero plate dark and low-contrast — the
grading layers assume it.

### Links
`operation.live` and `operation.code` currently point at `example.com` / `example.com`
GitHub URLs. Replace them in `operations`. Social URLs live in `socials`.

### Wiring the contact form for production
`app/api/transmission/route.ts` validates and logs. To ship it:

1. Forward the payload to your provider (Resend, Postmark, a CRM webhook).
2. Add rate limiting (Upstash / Vercel KV) and a bot check (Turnstile or a honeypot field).
3. Set the destination address in an environment variable.

---

## Design system

Tokens live in `app/globals.css` (`:root`) and `tailwind.config.ts`.

- **Ink** `#060708 → #272e30` — backgrounds, panels, hairlines
- **Bone** `#ece7dc` — primary text
- **Fog** `#6d7473 → #c6c9c3` — secondary text
- **Amber** `#e3a43d` — the single accent (actions, live markers, active states)
- **Alert** `#c8443a` — hostile markers only
- **Signal** `#6f8f7c` — status LEDs only

Type scale is fluid (`display-xl/lg/md/sm`), HUD labels are mono at 8–10px with wide
tracking, and body copy stays at 15–16px for readability. Corners are machined with a
`notch` clip-path instead of rounded cards.

### Motion rules used here
- reveals travel 14–22px and settle with a long `cubic-bezier(0.16, 1, 0.3, 1)`
- loops are slow (32s drift, 9–52s marquees) so they read as atmosphere, not animation
- interactive states are 300–700ms; nothing bounces
- glow appears **only** on hover/focus, never as ambient noise

---

## Accessibility & resilience

- semantic landmarks, one `h1`, ordered `h2`/`h3`
- skip link, visible focus rings (amber), full keyboard support in tabs, carousel and modal
- `aria-live` on form errors, clipboard confirmation, and testimonial selection
- `prefers-reduced-motion`: preloader skipped, canvas frozen, Lenis disabled, autoplay
  carousel off, all decorative loops neutralised
- portrait/hero images have real `alt` text; decorative HUD is `aria-hidden`
- the page is fully server-rendered (SEO-readable), the hero entrance is CSS-driven,
  and a `<noscript>` rule unhides every revealed section if JS is unavailable

### Performance notes
- First Load JS ≈ 202 kB (gzip) including Framer Motion and Lenis
- hero canvas caps at 30 fps and 1.6 DPR; all loops are transform/opacity or canvas
- fonts are self-hosted, `font-display: swap`, subset by Fontsource
- images optimised through `next/image`; only the hero plate is priority
- no layout thrash from scroll listeners (springs + motion values, not `setState`)

---

## Structure

```
app/
  layout.tsx          # fonts, chrome, providers, metadata
  page.tsx            # section composition
  globals.css         # tokens, textures, entrance choreography
  api/transmission/   # contact endpoint
  not-found.tsx       # in-world 404
components/
  chrome/             # nav, preloader, frame overlay, cursor, footer bits
  hero/               # Hero + canvas scene
  operations/         # cards, SVG plates, case-file modal
  tablet/             # the field terminal
  sections/           # about, operations, arsenal, timeline, capabilities, proof, contact, footer
  primitives/         # Reveal, MaskLine, SectionHeader, HudButton, Counter, Ticker, Brackets
  providers/          # SmoothScroll (Lenis)
data/site.ts          # all content
lib/                  # utils, hooks
public/media/         # plates and portrait
```

---

## Notes / intentional choices

- The interface plates are SVG, not screenshots: they never go stale, never break the
  palette, and stay crisp on retina.
- Testimonial avatars use monograms rather than stock faces — honest, and it keeps the
  page from looking like a template.
- All copy is placeholder-but-realistic. Names, clients and metrics should be replaced
  with your own before publishing.
