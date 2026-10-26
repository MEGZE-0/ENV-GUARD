/**
 * Single source of truth for all portfolio content.
 * Replace the values in this file with real data — every section reads from here.
 */

export const site = {
  name: "Daniel Rourke",
  brand: "ENV/GUARD",
  role: "Full-Stack Engineer",
  tagline: "Engineering products for the next frontier.",
  email: "daniel@envguard.dev",
  location: "Remote — UTC+2",
  availability: "Available Q1 2027",
  version: "v4.2.1",
  description:
    "Daniel Rourke is a full-stack engineer building resilient, high-craft web products — SaaS platforms, real-time systems and internal tools for teams that cannot afford downtime.",
} as const;

export const nav = [
  { id: "brief", index: "01", label: "Brief" },
  { id: "operations", index: "02", label: "Operations" },
  { id: "arsenal", index: "03", label: "Arsenal" },
  { id: "record", index: "04", label: "Record" },
  { id: "capabilities", index: "05", label: "Capabilities" },
  { id: "contact", index: "06", label: "Contact" },
] as const;

export const heroStats = [
  { value: "10", suffix: "YR", label: "Deployed" },
  { value: "48", suffix: "+", label: "Systems shipped" },
  { value: "99.98", suffix: "%", label: "Uptime held" },
  { value: "12", suffix: "×", label: "Eng. led" },
] as const;

export const about = {
  eyebrow: "Mission brief",
  title: "Calm delivery under real pressure.",
  portrait: "/media/portrait.webp",
  portraitAlt:
    "Daniel Rourke working in a dark operations room, lit by monitor glow",
  paragraphs: [
    "I'm a full-stack engineer with ten years spent where the stakes are real: logistics platforms moving 240,000 assets a day, clinical systems where a rounding error is a safety issue, marketplaces processing eight figures of volume.",
    "I work end to end — product framing, interface craft, data modelling, infrastructure — and I stay until it is measured, monitored and quiet. My favourite compliment is that a system just works and nobody talks about it.",
  ],
  mission:
    "Build software that behaves like infrastructure: invisible, dependable, and quietly excellent.",
  facts: [
    { k: "Role", v: "Principal Full-Stack Engineer" },
    { k: "Experience", v: "10 years / 4 continents" },
    { k: "Focus", v: "Product engineering, platform architecture" },
    { k: "Stack", v: "TypeScript, React, Node, PostgreSQL, AWS" },
    { k: "Status", v: "Selective engagements · Q1 2027" },
  ],
  principles: [
    {
      n: "01",
      title: "Smallest correct thing",
      copy: "Scope discipline is a feature. I ship the version that earns the right to grow.",
    },
    {
      n: "02",
      title: "Boring infrastructure",
      copy: "The database should be predictable so the product can be interesting.",
    },
    {
      n: "03",
      title: "Measure, then optimise",
      copy: "No performance work without a profile. No rewrite without a number.",
    },
    {
      n: "04",
      title: "Design is engineering",
      copy: "Interaction detail is not decoration — it is the product behaving correctly.",
    },
  ],
} as const;

export type OperationCategory =
  | "SaaS"
  | "Web Apps"
  | "AI & Data"
  | "Tools"
  | "Mobile";

export type Operation = {
  id: string;
  codename: string;
  title: string;
  category: OperationCategory;
  year: string;
  summary: string;
  stack: string[];
  metrics: { value: string; label: string }[];
  visual: "dashboard" | "map" | "chart" | "terminal" | "mobile";
  live: string;
  code: string;
  caseStudy: {
    context: string;
    problem: string;
    approach: string[];
    outcome: string[];
  };
};

export const operations: Operation[] = [
  {
    id: "atlas",
    codename: "Operation Atlas",
    title: "Fleet command platform",
    category: "SaaS",
    year: "2026",
    summary:
      "A geo-spatial control surface for a logistics operator running 240k assets across three continents. Live telemetry, dispatch, and exception handling in one screen.",
    stack: ["Next.js", "NestJS", "PostgreSQL", "PostGIS", "Redis", "AWS"],
    metrics: [
      { value: "240K", label: "Assets tracked" },
      { value: "62%", label: "Faster dispatch" },
      { value: "99.99%", label: "Uptime" },
    ],
    visual: "map",
    live: "https://example.com/atlas",
    code: "https://github.com/example/atlas",
    caseStudy: {
      context:
        "Six legacy tools, three regional teams, and a spreadsheet as the source of truth. Dispatch decisions took 40 minutes.",
      problem:
        "Dispatchers had no single view of fleet state, and every new region required a bespoke integration project.",
      approach: [
        "Modelled assets, routes and exceptions in PostGIS with a single event-sourced write path.",
        "Built a map-first interface with virtualised canvas rendering for 240k live markers.",
        "Introduced a regional adapter contract so new markets onboard without code changes.",
        "Instrumented p95 dispatch latency as a first-class product metric.",
      ],
      outcome: [
        "Dispatch time down 62%, from 40 minutes to 15.",
        "Three regions shipped in the first year on the same core.",
        "Platform team reduced from 9 to 5 while scope grew.",
      ],
    },
  },
  {
    id: "signal",
    codename: "Operation Signal",
    title: "Threat intelligence console",
    category: "AI & Data",
    year: "2025",
    summary:
      "Real-time event console ingesting 18M signals a day, clustering them with an ML pipeline, and surfacing only what an analyst can act on.",
    stack: ["TypeScript", "Node.js", "WebSockets", "ClickHouse", "Python"],
    metrics: [
      { value: "18M", label: "Events / day" },
      { value: "42ms", label: "p95 stream" },
      { value: "7×", label: "Analyst throughput" },
    ],
    visual: "terminal",
    live: "https://example.com/signal",
    code: "https://github.com/example/signal",
    caseStudy: {
      context:
        "An intelligence team was triaging a firehose by hand in four disconnected dashboards.",
      problem:
        "Signal was arriving faster than humans could read it. Alerts were noisy enough to be ignored.",
      approach: [
        "Built a streaming ingest layer with backpressure and exactly-once delivery into ClickHouse.",
        "Designed a triage interface around a keyboard-first queue, not a wall of charts.",
        "Added an ML scoring service with human-in-the-loop labels and a feedback loop.",
        "Kept the UI honest: every automated claim shows its evidence and confidence.",
      ],
      outcome: [
        "18M events per day at 42ms p95 end-to-end.",
        "Analyst throughput up 7×; false-positive queue cut by two thirds.",
        "Adopted by two additional teams without redesign.",
      ],
    },
  },
  {
    id: "nexus",
    codename: "Operation Nexus",
    title: "B2B procurement marketplace",
    category: "Web Apps",
    year: "2024",
    summary:
      "A procurement marketplace with negotiated pricing, approvals, and net-terms invoicing — built to survive finance teams, not just demo well.",
    stack: ["Next.js", "GraphQL", "PostgreSQL", "Stripe", "Turborepo"],
    metrics: [
      { value: "$14M", label: "GMV year one" },
      { value: "0.3s", label: "LCP" },
      { value: "4.8/5", label: "Buyer CSAT" },
    ],
    visual: "dashboard",
    live: "https://example.com/nexus",
    code: "https://github.com/example/nexus",
    caseStudy: {
      context:
        "A wholesale supplier wanted to move contracted buyers online without breaking negotiated terms.",
      problem:
        "Pricing had five dimensions and finance refused to approve a system it could not audit.",
      approach: [
        "Encoded pricing rules as a testable domain module with a full audit ledger.",
        "Built a shared design system across buyer, seller and admin surfaces in one monorepo.",
        "Made catalogue and search edge-cached, with per-buyer price projection.",
        "Ran a staged migration alongside the existing sales process for two quarters.",
      ],
      outcome: [
        "$14M GMV in the first year, 71% of contracted buyers migrated.",
        "Sub-second LCP on catalogue pages at 40k SKUs.",
        "Finance sign-off in a single review cycle.",
      ],
    },
  },
  {
    id: "pulse",
    codename: "Operation Pulse",
    title: "Clinical trial analytics",
    category: "SaaS",
    year: "2023",
    summary:
      "Regulated analytics for trial coordinators: cohort health, adverse events, and export-ready reporting with a complete audit trail.",
    stack: ["React", "Python", "FastAPI", "BigQuery", "Docker"],
    metrics: [
      { value: "31", label: "Sites live" },
      { value: "100%", label: "Audit coverage" },
      { value: "−48%", label: "Report time" },
    ],
    visual: "chart",
    live: "https://example.com/pulse",
    code: "https://github.com/example/pulse",
    caseStudy: {
      context:
        "Trial coordinators were assembling monthly safety reports by exporting CSVs from three systems.",
      problem:
        "Data provenance was unclear, and any analytics change required a validation cycle.",
      approach: [
        "Built an immutable audit layer so every number on screen traces to a source record.",
        "Standardised metric definitions in a versioned semantic layer.",
        "Designed charts for clinical reading — annotation-first, colour-safe, printable.",
        "Automated validation checks into CI with fixtures from anonymised trials.",
      ],
      outcome: [
        "Report assembly cut from 6 hours to 20 minutes per site per month.",
        "Full audit coverage across 31 sites with zero findings.",
        "Semantic layer reused by two later studies.",
      ],
    },
  },
  {
    id: "recon",
    codename: "Operation Recon",
    title: "Satellite imagery viewer",
    category: "Tools",
    year: "2022",
    summary:
      "A browser-native imagery viewer for multi-gigabyte satellite tiles: GPU-accelerated, offline-capable, built for analysts on modest hardware.",
    stack: ["Three.js", "WebGL", "WASM", "Rust", "TypeScript"],
    metrics: [
      { value: "60fps", label: "On integrated GPU" },
      { value: "−73%", label: "Memory use" },
      { value: "1.2GB", label: "Tiles streamed" },
    ],
    visual: "map",
    live: "https://example.com/recon",
    code: "https://github.com/example/recon",
    caseStudy: {
      context:
        "Analysts were waiting on a desktop GIS licence and a workstation to compare two captures.",
      problem:
        "Naive decoding blew the memory budget on anything larger than a single scene.",
      approach: [
        "Wrote a Rust/WASM tile decoder with bounded memory pooling.",
        "Streamed and evicted tiles against an explicit GPU budget.",
        "Built a swipe-compare and annotation layer that works with keyboard and trackpad.",
        "Degraded gracefully to a 2D canvas path on low-power devices.",
      ],
      outcome: [
        "60fps on integrated graphics with a 1.2GB streamed scene.",
        "Memory footprint down 73% versus the prototype.",
        "Deployed to field laptops with no discrete GPU.",
      ],
    },
  },
  {
    id: "kestrel",
    codename: "Operation Kestrel",
    title: "Offline-first field inspections",
    category: "Mobile",
    year: "2021",
    summary:
      "A field inspection app for crews working without signal — conflict-free sync, photo evidence, and a supervisor view that actually trusts the data.",
    stack: ["React Native", "SQLite", "TypeScript", "Node.js", "S3"],
    metrics: [
      { value: "0", label: "Lost records" },
      { value: "4", label: "Countries" },
      { value: "−65%", label: "Admin time" },
    ],
    visual: "mobile",
    live: "https://example.com/kestrel",
    code: "https://github.com/example/kestrel",
    caseStudy: {
      context:
        "Inspection crews in remote regions were photographing forms and re-entering them at the office.",
      problem:
        "Connectivity was intermittent for days, and duplicate entries were corrupting reports.",
      approach: [
        "Built a local-first SQLite store with a CRDT-inspired merge for text and photo metadata.",
        "Queued uploads with resumable, chunked transfers and conflict surfacing.",
        "Designed large-target, glove-friendly interactions tested on site.",
        "Gave supervisors a diff view so every merge is explainable.",
      ],
      outcome: [
        "Zero lost records across four countries in 18 months.",
        "Administrative time down 65%.",
        "Crews kept using it after the pilot — the real signal.",
      ],
    },
  },
];

export type SkillCategory = {
  id: string;
  label: string;
  short: string;
  icon: "code" | "server" | "database" | "cloud" | "wrench" | "pen";
  readiness: number;
  note: string;
  skills: { name: string; level: number; tag: string }[];
};

export const arsenal: SkillCategory[] = [
  {
    id: "frontend",
    label: "Frontend",
    short: "FE",
    icon: "code",
    readiness: 96,
    note: "Interface systems that stay fast as they grow.",
    skills: [
      { name: "TypeScript", level: 96, tag: "TS" },
      { name: "React 19", level: 97, tag: "UI" },
      { name: "Next.js", level: 95, tag: "SSR" },
      { name: "Tailwind CSS", level: 94, tag: "CSS" },
      { name: "HTML / CSS", level: 98, tag: "DOM" },
      { name: "Framer Motion", level: 90, tag: "MOT" },
      { name: "Three.js / WebGL", level: 74, tag: "GL" },
    ],
  },
  {
    id: "backend",
    label: "Backend",
    short: "BE",
    icon: "server",
    readiness: 94,
    note: "Contracts first. Predictable failure modes.",
    skills: [
      { name: "Node.js", level: 95, tag: "RT" },
      { name: "NestJS", level: 90, tag: "API" },
      { name: "Express", level: 92, tag: "API" },
      { name: "REST APIs", level: 96, tag: "HTTP" },
      { name: "GraphQL", level: 88, tag: "GQL" },
      { name: "Python", level: 85, tag: "PY" },
      { name: "WebSockets", level: 90, tag: "WS" },
    ],
  },
  {
    id: "data",
    label: "Database",
    short: "DB",
    icon: "database",
    readiness: 93,
    note: "Schema is a product decision, not a detail.",
    skills: [
      { name: "PostgreSQL", level: 94, tag: "SQL" },
      { name: "Prisma", level: 93, tag: "ORM" },
      { name: "Redis", level: 90, tag: "K/V" },
      { name: "MongoDB", level: 86, tag: "DOC" },
      { name: "ClickHouse", level: 70, tag: "OLAP" },
      { name: "PostGIS", level: 78, tag: "GEO" },
    ],
  },
  {
    id: "cloud",
    label: "DevOps / Cloud",
    short: "OPS",
    icon: "cloud",
    readiness: 89,
    note: "If it isn't observable, it isn't shipped.",
    skills: [
      { name: "Docker", level: 92, tag: "CTR" },
      { name: "CI/CD", level: 90, tag: "PIPE" },
      { name: "AWS", level: 86, tag: "CLD" },
      { name: "Kubernetes", level: 82, tag: "K8S" },
      { name: "Terraform", level: 74, tag: "IAC" },
      { name: "Observability", level: 80, tag: "OTEL" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    short: "TL",
    icon: "wrench",
    readiness: 95,
    note: "The workflow is part of the engineering.",
    skills: [
      { name: "Git / GitHub", level: 97, tag: "VCS" },
      { name: "Playwright", level: 88, tag: "E2E" },
      { name: "Vite", level: 90, tag: "BLD" },
      { name: "Turborepo", level: 85, tag: "MONO" },
      { name: "Sentry", level: 86, tag: "ERR" },
      { name: "Postman", level: 88, tag: "API" },
    ],
  },
  {
    id: "design",
    label: "Design / Collaboration",
    short: "DS",
    icon: "pen",
    readiness: 91,
    note: "Design systems that engineers actually use.",
    skills: [
      { name: "Figma", level: 84, tag: "UI" },
      { name: "Design systems", level: 88, tag: "SYS" },
      { name: "Accessibility", level: 86, tag: "A11Y" },
      { name: "Product strategy", level: 82, tag: "PRD" },
      { name: "Linear / Notion", level: 90, tag: "OPS" },
      { name: "Technical writing", level: 87, tag: "DOC" },
    ],
  },
];

export type Experience = {
  period: string;
  role: string;
  company: string;
  location: string;
  summary: string;
  achievements: string[];
  stack: string[];
};

export const experience: Experience[] = [
  {
    period: "2023 — Present",
    role: "Principal Full-Stack Engineer",
    company: "Northwind Systems",
    location: "Berlin / Remote",
    summary:
      "Platform lead for a logistics intelligence product used by 9,000 operators daily. Own architecture, interface quality and the engineering standard.",
    achievements: [
      "Led a team of 12 across platform, design engineering and SRE.",
      "Cut p95 API latency from 340ms to 90ms without a rearchitecture.",
      "Shipped the shared design system now used by four product squads.",
      "Held 99.99% availability through a 3× traffic increase.",
    ],
    stack: ["Next.js", "NestJS", "PostgreSQL", "AWS", "Terraform"],
  },
  {
    period: "2020 — 2023",
    role: "Senior Full-Stack Engineer",
    company: "Helix Labs",
    location: "Amsterdam",
    summary:
      "Built the real-time analytics core of an intelligence platform from prototype to 18M events a day.",
    achievements: [
      "Designed the streaming ingest and query layer on ClickHouse.",
      "Reduced analyst triage time by 7× with a keyboard-first console.",
      "Introduced contract testing across six services; regressions down 71%.",
      "Mentored five engineers; two promoted to senior.",
    ],
    stack: ["TypeScript", "Node.js", "ClickHouse", "Kafka", "Kubernetes"],
  },
  {
    period: "2018 — 2020",
    role: "Full-Stack Developer",
    company: "Fieldwork Studio",
    location: "London",
    summary:
      "Product engineer on 20+ client engagements — marketplaces, internal tools and editorial platforms.",
    achievements: [
      "Delivered a B2B marketplace that reached $3M GMV in eight months.",
      "Built the studio's component library, halving new-project setup.",
      "Owned accessibility remediation on three public-sector projects.",
    ],
    stack: ["React", "Node.js", "GraphQL", "PostgreSQL"],
  },
  {
    period: "2016 — 2018",
    role: "Frontend Engineer",
    company: "Vector Interactive",
    location: "Copenhagen",
    summary:
      "Interaction-heavy product sites and data visualisation for automotive and energy clients.",
    achievements: [
      "Shipped two award-shortlisted WebGL experiences.",
      "Built a canvas charting toolkit reused across 11 campaigns.",
      "Set the studio's performance budget: 90+ Lighthouse, no exceptions.",
    ],
    stack: ["JavaScript", "WebGL", "D3", "GSAP"],
  },
  {
    period: "2014 — 2016",
    role: "Independent Developer",
    company: "Freelance",
    location: "Remote",
    summary:
      "First deployments: small business platforms, booking systems and the habits that carried forward.",
    achievements: [
      "Delivered 14 projects solo, end to end.",
      "Learned to price, scope and say no.",
    ],
    stack: ["PHP", "JavaScript", "MySQL"],
  },
];

export const capabilities = [
  {
    index: "01",
    title: "Full-Stack Product Build",
    copy: "Zero-to-one products with a real architecture underneath — not a demo that collapses at scale.",
    tags: ["Discovery", "Architecture", "Delivery"],
  },
  {
    index: "02",
    title: "SaaS Platforms",
    copy: "Multi-tenant systems with billing, roles, audit trails and the operational surface a support team needs.",
    tags: ["Multi-tenant", "Billing", "Admin"],
  },
  {
    index: "03",
    title: "Dashboards & Ops Tools",
    copy: "Dense, fast interfaces for people who live in them eight hours a day. Keyboard-first, information-dense, calm.",
    tags: ["Data viz", "Realtime", "Density"],
  },
  {
    index: "04",
    title: "API & Systems Architecture",
    copy: "Contracts, schemas and service boundaries designed so the third year costs less than the first.",
    tags: ["REST", "GraphQL", "Events"],
  },
  {
    index: "05",
    title: "Performance & Reliability",
    copy: "Profiling, budgeting and observability. I make the number smaller and prove it in production.",
    tags: ["Core Web Vitals", "SLOs", "Caching"],
  },
  {
    index: "06",
    title: "AI Integration",
    copy: "Practical model integration — retrieval, evaluation, guardrails — where it genuinely reduces work.",
    tags: ["RAG", "Evals", "Pipelines"],
  },
  {
    index: "07",
    title: "Design Engineering",
    copy: "Design systems and interface craft implemented to the pixel, with motion that communicates rather than decorates.",
    tags: ["Design systems", "Motion", "A11y"],
  },
  {
    index: "08",
    title: "Automation & Tooling",
    copy: "The unglamorous internal work that buys your team back a day a week.",
    tags: ["CI/CD", "Scripts", "Integrations"],
  },
] as const;

export const testimonials = [
  {
    quote:
      "Daniel is the engineer you hand the impossible quarter to. He rewrote our dispatch model while the business was still running on it — no downtime, no drama, and the numbers moved in the first month.",
    name: "Mara Lindqvist",
    role: "VP Engineering",
    company: "Northwind Systems",
    initials: "ML",
    metric: "p95 −74%",
  },
  {
    quote:
      "Most contractors deliver a feature. Daniel delivered a standard. Two years on, our team still works the way he set us up to work.",
    name: "Idris Okafor",
    role: "CTO",
    company: "Helix Labs",
    initials: "IO",
    metric: "7× throughput",
  },
  {
    quote:
      "He found the pricing model nobody wanted to touch, documented it, tested it, and made finance sign off in one meeting. Rare combination of rigour and taste.",
    name: "Sofia Almeida",
    role: "Founder",
    company: "Nexus Supply",
    initials: "SA",
    metric: "$14M GMV",
  },
  {
    quote:
      "The calmest person in the room during an incident, and the one whose interface decisions our analysts still quote. He raises the bar and leaves it there.",
    name: "Tobias Rehn",
    role: "Head of Product",
    company: "Meridian Analytics",
    initials: "TR",
    metric: "99.99% SLA",
  },
] as const;

export const proofMetrics = [
  { value: "48", label: "Systems in production" },
  { value: "99.98%", label: "Median uptime held" },
  { value: "18", label: "Clients & teams served" },
  { value: "0", label: "Missed launches" },
] as const;

export const socials = [
  { label: "GitHub", handle: "@danielrourke", href: "https://github.com/" },
  { label: "LinkedIn", handle: "in/danielrourke", href: "https://linkedin.com/" },
  { label: "Read.cv", handle: "danielrourke", href: "https://read.cv/" },
] as const;

export const serviceScopes = [
  "Full-stack build",
  "SaaS platform",
  "Rescue / audit",
  "Contract or advisory",
] as const;
