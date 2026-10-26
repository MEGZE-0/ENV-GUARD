/**
 * Interface plates for each operation. Pure SVG so they stay crisp at any
 * size, weigh a few kB, and share the site's design language exactly.
 */

const BONE = "#ece7dc";
const AMBER = "#e3a43d";
const ALERT = "#c8443a";
const MUTED = "#8b928f";

type Variant = "dashboard" | "map" | "chart" | "terminal" | "mobile";

function Chrome({ label, right }: { label: string; right: string }) {
  return (
    <>
      <rect x="0" y="0" width="800" height="34" fill="#0d1112" />
      <line x1="0" y1="34" x2="800" y2="34" stroke={BONE} strokeOpacity="0.08" />
      <circle cx="18" cy="17" r="2.4" fill={AMBER} />
      <text x="30" y="21" fontSize="9" letterSpacing="2" fill={BONE} fillOpacity="0.62" fontFamily="monospace">
        {label}
      </text>
      <text x="770" y="21" fontSize="8" letterSpacing="1.6" fill={BONE} fillOpacity="0.3" textAnchor="end" fontFamily="monospace">
        {right}
      </text>
    </>
  );
}

function Bar({
  x,
  y,
  w,
  h = 4,
  o = 0.16,
  fill = BONE,
}: {
  x: number | string;
  y: number | string;
  w: number | string;
  h?: number;
  o?: number;
  fill?: string;
}) {
  return <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={fill} fillOpacity={o} />;
}

/* ------------------------------------------------------------------ */
/* 01 — FLEET MAP                                                      */
/* ------------------------------------------------------------------ */
function FleetMap() {
  const markers = [
    [430, 190, AMBER],
    [520, 250, AMBER],
    [610, 205, ALERT],
    [470, 300, AMBER],
    [330, 250, ALERT],
    [560, 330, AMBER],
    [390, 350, AMBER],
    [660, 290, AMBER],
  ] as const;

  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Fleet operations map interface">
      <rect width="800" height="500" fill="#0a0d0e" />
      <Chrome label="ATLAS // FLEET OPS" right="LIVE · 240,118 ASSETS" />

      {/* terrain */}
      <g>
        <path
          d="M200 34 H800 V500 H470 C430 430 500 380 460 330 C420 280 470 230 430 170 C400 120 330 100 300 60 Z"
          fill="#111718"
        />
        <path
          d="M200 34 H800 V500 H470 C430 430 500 380 460 330 C420 280 470 230 430 170 C400 120 330 100 300 60 Z"
          stroke={BONE}
          strokeOpacity="0.12"
          fill="none"
        />
        <path d="M470 500 C440 430 512 380 470 330 C430 280 480 232 440 172 C412 128 350 104 322 66" stroke="#2a3436" strokeWidth="6" fill="none" />
        <path d="M470 500 C440 430 512 380 470 330 C430 280 480 232 440 172 C412 128 350 104 322 66" stroke={BONE} strokeOpacity="0.16" strokeWidth="1" fill="none" />
        {/* roads */}
        {[
          "M210 120 L360 150 L470 210 L620 180 L780 230",
          "M215 260 L340 250 L470 300 L600 270 L760 320",
          "M240 400 L390 350 L520 380 L660 340 L790 390",
        ].map((d, i) => (
          <path key={i} d={d} stroke={AMBER} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="5 6" fill="none" />
        ))}
        {/* grid */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`x${i}`} x1={200 + i * 60} y1="34" x2={200 + i * 60} y2="500" stroke={BONE} strokeOpacity="0.035" />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`y${i}`} x1="200" y1={34 + i * 60} x2="800" y2={34 + i * 60} stroke={BONE} strokeOpacity="0.035" />
        ))}
        {/* active route */}
        <path d="M430 190 L520 250 L610 205" stroke={AMBER} strokeOpacity="0.75" strokeWidth="1.4" fill="none" />
        <path d="M520 250 L470 300 L560 330" stroke={AMBER} strokeOpacity="0.35" strokeWidth="1.2" fill="none" strokeDasharray="3 4" />
      </g>

      {/* markers */}
      {markers.map(([x, y, c], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={9 + (i % 3) * 4} fill="none" stroke={c} strokeOpacity="0.22" />
          <circle cx={x} cy={y} r="3" fill={c} />
          {c === ALERT ? <circle cx={x} cy={y} r="1.4" fill="#0a0d0e" /> : null}
        </g>
      ))}
      <rect x="612" y="176" width="72" height="16" fill="#0a0d0e" fillOpacity="0.8" stroke={ALERT} strokeOpacity="0.35" />
      <text x="618" y="187" fontSize="7" fill={ALERT} fontFamily="monospace" letterSpacing="1">
        SIG-04
      </text>

      {/* left panel */}
      <g>
        <rect x="0" y="34" width="200" height="466" fill="#0c1011" />
        <line x1="200" y1="34" x2="200" y2="500" stroke={BONE} strokeOpacity="0.08" />
        <text x="18" y="62" fontSize="8" letterSpacing="1.8" fill={BONE} fillOpacity="0.35" fontFamily="monospace">
          ACTIVE FLEET
        </text>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <rect x="10" y={76 + i * 48} width="180" height="40" fill={i === 0 ? AMBER : BONE} fillOpacity={i === 0 ? 0.08 : 0.025} />
            {i === 0 ? <rect x="10" y={76 + i * 48} width="2" height="40" fill={AMBER} /> : null}
            <circle cx="24" cy={90 + i * 48} r="2.6" fill={i === 4 ? ALERT : i === 0 ? AMBER : "#6f8f7c"} />
            <Bar x="34" y={84 + i * 48} w={i % 2 ? 86 : 104} o={0.4} />
            <Bar x="34" y={94 + i * 48} w={i % 2 ? 56 : 42} h={3} o={0.16} />
            <text x="176" y={92 + i * 48} fontSize="7" fill={BONE} fillOpacity="0.28" textAnchor="end" fontFamily="monospace">
              {["A-118", "A-204", "B-032", "A-071", "C-014", "B-229"][i]}
            </text>
          </g>
        ))}
        <rect x="10" y="378" width="180" height="1" fill={BONE} fillOpacity="0.08" />
        <text x="18" y="400" fontSize="7" letterSpacing="1.6" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
          DISPATCH LOAD
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="18" y={412 + i * 12} width={150 * [0.82, 0.6, 0.94, 0.44, 0.7][i]} height="5" rx="2" fill={i === 2 ? AMBER : BONE} fillOpacity={i === 2 ? 0.55 : 0.12} />
        ))}
        <text x="18" y="482" fontSize="7" fill={AMBER} fillOpacity="0.7" fontFamily="monospace" letterSpacing="1.4">
          62% FASTER DISPATCH
        </text>
      </g>

      {/* bottom coordinates */}
      <text x="215" y="486" fontSize="7" fill={BONE} fillOpacity="0.25" fontFamily="monospace" letterSpacing="1.4">
        31.2372°N 32.3014°E · ZOOM 11 · 240K
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 02 — MARKETPLACE DASHBOARD                                          */
/* ------------------------------------------------------------------ */
function ProcurementDashboard() {
  const kpis = [
    { v: "$14.2M", l: "GMV YTD", up: "+18%" },
    { v: "1,284", l: "ACTIVE BUYERS", up: "+6%" },
    { v: "98.4%", l: "FILL RATE", up: "+2.1%" },
  ];
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Procurement dashboard interface">
      <rect width="800" height="500" fill="#0a0d0e" />
      <Chrome label="NEXUS // PROCUREMENT" right="Q4 · CONTRACTED" />

      {/* rail */}
      <rect x="0" y="34" width="48" height="466" fill="#0c1011" />
      <line x1="48" y1="34" x2="48" y2="500" stroke={BONE} strokeOpacity="0.08" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="17" y={58 + i * 34} width="14" height="14" rx="2" fill={i === 0 ? AMBER : BONE} fillOpacity={i === 0 ? 0.85 : 0.14} />
        </g>
      ))}
      <circle cx="24" cy="466" r="9" fill={BONE} fillOpacity="0.12" />

      {/* header */}
      <text x="72" y="66" fontSize="13" fill={BONE} fillOpacity="0.85" fontFamily="monospace" letterSpacing="1">
        PROCUREMENT / OVERVIEW
      </text>
      <rect x="640" y="52" width="130" height="22" rx="2" fill={AMBER} fillOpacity="0.14" stroke={AMBER} strokeOpacity="0.3" />
      <text x="705" y="67" fontSize="8" fill={AMBER} textAnchor="middle" fontFamily="monospace" letterSpacing="1.4">
        NEW ORDER
      </text>

      {/* KPI cards */}
      {kpis.map((k, i) => (
        <g key={k.l}>
          <rect x={72 + i * 232} y="90" width="212" height="88" fill="#101416" stroke={BONE} strokeOpacity="0.08" />
          <text x={88 + i * 232} y="118" fontSize="7.5" letterSpacing="1.6" fill={BONE} fillOpacity="0.32" fontFamily="monospace">
            {k.l}
          </text>
          <text x={88 + i * 232} y="150" fontSize="24" fill={BONE} fillOpacity="0.9" fontFamily="monospace">
            {k.v}
          </text>
          <text x={88 + i * 232} y="168" fontSize="8" fill={AMBER} fillOpacity="0.8" fontFamily="monospace">
            {k.up}
          </text>
          <path
            d={`M${200 + i * 232} 160 l14 -8 l12 5 l14 -12 l12 4 l16 -14`}
            stroke={AMBER}
            strokeOpacity="0.45"
            fill="none"
          />
        </g>
      ))}

      {/* chart */}
      <rect x="72" y="196" width="444" height="204" fill="#101416" stroke={BONE} strokeOpacity="0.08" />
      <text x="88" y="220" fontSize="7.5" letterSpacing="1.6" fill={BONE} fillOpacity="0.32" fontFamily="monospace">
        ORDER VOLUME · 90 DAYS
      </text>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="88" y1={244 + i * 36} x2="500" y2={244 + i * 36} stroke={BONE} strokeOpacity="0.05" />
      ))}
      <path
        d="M88 372 L130 350 L172 358 L214 322 L256 336 L298 300 L340 312 L382 276 L424 286 L466 250 L500 262 L500 392 L88 392 Z"
        fill={AMBER}
        fillOpacity="0.09"
      />
      <path
        d="M88 372 L130 350 L172 358 L214 322 L256 336 L298 300 L340 312 L382 276 L424 286 L466 250 L500 262"
        stroke={AMBER}
        strokeOpacity="0.85"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M88 384 L130 378 L172 380 L214 366 L256 372 L298 358 L340 364 L382 348 L424 354 L466 340 L500 344"
        stroke={BONE}
        strokeOpacity="0.25"
        strokeWidth="1.2"
        fill="none"
      />
      <circle cx="466" cy="250" r="3.4" fill={AMBER} />
      <rect x="404" y="222" width="88" height="20" fill="#0a0d0e" stroke={AMBER} strokeOpacity="0.35" />
      <text x="412" y="235" fontSize="7" fill={AMBER} fontFamily="monospace" letterSpacing="1">
        $1.84M · WEEK 41
      </text>

      {/* table */}
      <rect x="532" y="196" width="238" height="204" fill="#101416" stroke={BONE} strokeOpacity="0.08" />
      <text x="548" y="220" fontSize="7.5" letterSpacing="1.6" fill={BONE} fillOpacity="0.32" fontFamily="monospace">
        PENDING APPROVAL
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <line x1="548" y1={236 + i * 32} x2="754" y2={236 + i * 32} stroke={BONE} strokeOpacity="0.06" />
          <circle cx="554" cy={252 + i * 32} r="2.4" fill={i === 1 ? AMBER : BONE} fillOpacity={i === 1 ? 1 : 0.3} />
          <Bar x="566" y={248 + i * 32} w={i % 2 ? 82 : 104} o={0.3} />
          <Bar x="566" y={256 + i * 32} w={i % 2 ? 52 : 40} h={3} o={0.12} />
          <rect x="690" y={244 + i * 32} width="64" height="14" rx="2" fill={i === 1 ? AMBER : BONE} fillOpacity={i === 1 ? 0.16 : 0.05} />
          <text x="722" y={254 + i * 32} fontSize="6.5" textAnchor="middle" fill={i === 1 ? AMBER : BONE} fillOpacity={i === 1 ? 1 : 0.4} fontFamily="monospace" letterSpacing="1">
            {i === 1 ? "REVIEW" : "QUEUED"}
          </text>
        </g>
      ))}

      {/* footer rows */}
      <line x1="72" y1="424" x2="770" y2="424" stroke={BONE} strokeOpacity="0.08" />
      <text x="72" y="454" fontSize="8" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1.4">
        40,120 SKU · 5 PRICE TIERS · AUDIT LEDGER ACTIVE
      </text>
      <text x="770" y="454" fontSize="8" fill={AMBER} fillOpacity="0.6" textAnchor="end" fontFamily="monospace" letterSpacing="1.4">
        LCP 0.3S
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 03 — CLINICAL ANALYTICS                                             */
/* ------------------------------------------------------------------ */
function ClinicalChart() {
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Clinical trial analytics interface">
      <rect width="800" height="500" fill="#0a0d0e" />
      <Chrome label="PULSE // TRIAL ANALYTICS" right="SITES 31 · AUDITED" />

      <text x="36" y="82" fontSize="18" fill={BONE} fillOpacity="0.88" fontFamily="monospace" letterSpacing="0.5">
        COHORT HEALTH
      </text>
      <text x="36" y="104" fontSize="8" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1.4">
        STUDY NRG-114 · READ-ONLY · 12 OCT 2026
      </text>
      {["7D", "30D", "90D", "ALL"].map((t, i) => (
        <g key={t}>
          <rect x={586 + i * 48} y="70" width="42" height="22" fill={i === 1 ? AMBER : BONE} fillOpacity={i === 1 ? 0.14 : 0.03} stroke={i === 1 ? AMBER : BONE} strokeOpacity={i === 1 ? 0.3 : 0.1} />
          <text x={607 + i * 48} y="85" fontSize="7" textAnchor="middle" fill={i === 1 ? AMBER : BONE} fillOpacity={i === 1 ? 1 : 0.4} fontFamily="monospace" letterSpacing="1">
            {t}
          </text>
        </g>
      ))}

      {/* main chart */}
      <rect x="36" y="126" width="728" height="252" fill="#0d1112" stroke={BONE} strokeOpacity="0.08" />
      {Array.from({ length: 6 }).map((_, i) => (
        <g key={i}>
          <line x1="56" y1={158 + i * 40} x2="744" y2={158 + i * 40} stroke={BONE} strokeOpacity="0.05" />
          <text x="48" y={161 + i * 40} fontSize="6.5" textAnchor="end" fill={BONE} fillOpacity="0.22" fontFamily="monospace">
            {[100, 80, 60, 40, 20, 0][i]}
          </text>
        </g>
      ))}
      <path
        d="M56 330 L120 312 L184 318 L248 288 L312 296 L376 262 L440 268 L504 232 L568 240 L632 206 L696 212 L744 190 L744 358 L56 358 Z"
        fill={AMBER}
        fillOpacity="0.1"
      />
      <path
        d="M56 330 L120 312 L184 318 L248 288 L312 296 L376 262 L440 268 L504 232 L568 240 L632 206 L696 212 L744 190"
        stroke={AMBER}
        strokeOpacity="0.9"
        strokeWidth="1.6"
        fill="none"
      />
      <path
        d="M56 344 L120 340 L184 346 L248 330 L312 336 L376 322 L440 328 L504 312 L568 318 L632 304 L696 308 L744 296"
        stroke={BONE}
        strokeOpacity="0.28"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        fill="none"
      />
      <circle cx="504" cy="232" r="4" fill={AMBER} />
      <circle cx="504" cy="232" r="10" fill="none" stroke={AMBER} strokeOpacity="0.3" />
      <rect x="462" y="188" width="128" height="26" fill="#0a0d0e" stroke={AMBER} strokeOpacity="0.35" />
      <text x="472" y="204" fontSize="7" fill={BONE} fillOpacity="0.7" fontFamily="monospace" letterSpacing="0.8">
        ENROLMENT 1,842
      </text>
      <text x="472" y="212" fontSize="6" fill={AMBER} fillOpacity="0.7" fontFamily="monospace" letterSpacing="0.8">
        +7.2% VS TARGET
      </text>

      {/* lower cards */}
      {[
        { t: "ADVERSE EVENTS", v: "12", s: "0 serious", accent: ALERT },
        { t: "DATA COMPLETENESS", v: "99.1%", s: "31 sites", accent: AMBER },
        { t: "REPORT TIME", v: "20m", s: "was 6h", accent: BONE },
      ].map((c, i) => (
        <g key={c.t}>
          <rect x={36 + i * 248} y="396" width="232" height="72" fill="#101416" stroke={BONE} strokeOpacity="0.08" />
          <text x={52 + i * 248} y="418" fontSize="7" letterSpacing="1.4" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
            {c.t}
          </text>
          <text x={52 + i * 248} y="446" fontSize="20" fill={c.accent} fillOpacity={c.accent === BONE ? 0.85 : 1} fontFamily="monospace">
            {c.v}
          </text>
          <text x={52 + i * 248} y="460" fontSize="7" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
            {c.s}
          </text>
          <g opacity="0.5">
            {[0, 1, 2, 3, 4, 5, 6].map((b) => (
              <rect key={b} x={180 + i * 248 + b * 9} y={430 - (b % 4) * 8} width="4" height={12 + (b % 4) * 8} fill={AMBER} fillOpacity="0.35" />
            ))}
          </g>
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 04 — SIGNAL CONSOLE                                                 */
/* ------------------------------------------------------------------ */
function SignalConsole() {
  const rows = [
    { t: "12:04:11", sev: ALERT, w: 300 },
    { t: "12:04:09", sev: AMBER, w: 240 },
    { t: "12:04:04", sev: MUTED, w: 196 },
    { t: "12:03:58", sev: AMBER, w: 268 },
    { t: "12:03:51", sev: MUTED, w: 160 },
    { t: "12:03:44", sev: MUTED, w: 214 },
    { t: "12:03:39", sev: AMBER, w: 178 },
    { t: "12:03:31", sev: MUTED, w: 150 },
  ];
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Threat intelligence console interface">
      <rect width="800" height="500" fill="#0a0d0e" />
      <Chrome label="SIGNAL // EVENT STREAM" right="18.2M / DAY · 42MS" />

      {/* left tabs */}
      <rect x="0" y="34" width="150" height="466" fill="#0c1011" />
      <line x1="150" y1="34" x2="150" y2="500" stroke={BONE} strokeOpacity="0.08" />
      {["STREAM", "CLUSTERS", "SOURCES", "ALERTS", "MODEL"].map((t, i) => (
        <g key={t}>
          {i === 0 ? <rect x="0" y={50 + i * 32} width="2" height="22" fill={AMBER} /> : null}
          <text x="18" y={66 + i * 32} fontSize="8" letterSpacing="1.4" fill={i === 0 ? AMBER : BONE} fillOpacity={i === 0 ? 1 : 0.32} fontFamily="monospace">
            {t}
          </text>
          <text x="132" y={66 + i * 32} fontSize="7" textAnchor="end" fill={BONE} fillOpacity="0.2" fontFamily="monospace">
            {["18", "42", "06", "03", "v4"][i]}
          </text>
        </g>
      ))}
      <text x="18" y="250" fontSize="7" letterSpacing="1.4" fill={BONE} fillOpacity="0.25" fontFamily="monospace">
        CONFIDENCE
      </text>
      <rect x="18" y="262" width="116" height="5" rx="2" fill={BONE} fillOpacity="0.1" />
      <rect x="18" y="262" width="88" height="5" rx="2" fill={AMBER} fillOpacity="0.7" />
      <text x="18" y="286" fontSize="7" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
        0.87 AVG
      </text>

      {/* log rows */}
      {rows.map((r, i) => (
        <g key={i}>
          <rect x="150" y={50 + i * 44} width="466" height="38" fill={i === 0 ? AMBER : BONE} fillOpacity={i === 0 ? 0.055 : 0.015} />
          <line x1="150" y1={88 + i * 44} x2="616" y2={88 + i * 44} stroke={BONE} strokeOpacity="0.05" />
          <text x="166" y={72 + i * 44} fontSize="7.5" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
            {r.t}
          </text>
          <circle cx="222" cy={69 + i * 44} r="2.6" fill={r.sev} />
          <Bar x="236" y={62 + i * 44} w={r.w} o={i === 0 ? 0.5 : 0.22} h={5} />
          <Bar x="236" y={73 + i * 44} w={r.w * 0.62} o={0.1} h={3} />
          <text x="600" y={72 + i * 44} fontSize="6.5" textAnchor="end" fill={BONE} fillOpacity="0.22" fontFamily="monospace">
            {["CRIT", "HIGH", "INFO", "HIGH", "INFO", "INFO", "HIGH", "INFO"][i]}
          </text>
        </g>
      ))}

      {/* right detail */}
      <rect x="616" y="50" width="184" height="404" fill="#0d1112" stroke={BONE} strokeOpacity="0.08" />
      <text x="632" y="74" fontSize="7" letterSpacing="1.4" fill={BONE} fillOpacity="0.3" fontFamily="monospace">
        SELECTED SIGNAL
      </text>
      <text x="632" y="106" fontSize="26" fill={AMBER} fontFamily="monospace">
        0.94
      </text>
      <text x="632" y="120" fontSize="6.5" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1">
        CONFIDENCE
      </text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <text x="632" y={150 + i * 34} fontSize="6.5" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1">
            {["SOURCE", "CLUSTER", "REGION", "FIRST SEEN"][i]}
          </text>
          <Bar x="632" y={158 + i * 34} w={[110, 84, 68, 92][i]} h={4} o={0.24} />
        </g>
      ))}
      <line x1="632" y1="300" x2="784" y2="300" stroke={BONE} strokeOpacity="0.08" />
      <text x="632" y="322" fontSize="7" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1.2">
        EVIDENCE
      </text>
      <path d="M632 350 l20 -10 l18 8 l22 -16 l20 6 l24 -18 l18 10" stroke={AMBER} strokeOpacity="0.6" fill="none" />
      <rect x="632" y="390" width="152" height="26" fill={AMBER} fillOpacity="0.12" stroke={AMBER} strokeOpacity="0.25" />
      <text x="708" y="407" fontSize="7" textAnchor="middle" fill={AMBER} fontFamily="monospace" letterSpacing="1.2">
        ESCALATE
      </text>

      <text x="166" y="480" fontSize="7" fill={BONE} fillOpacity="0.22" fontFamily="monospace" letterSpacing="1.2">
        KEYBOARD-FIRST TRIAGE · J/K NAVIGATE · ⏎ ACTION
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* 05 — FIELD APP                                                      */
/* ------------------------------------------------------------------ */
function FieldApp() {
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Offline-first field inspection mobile app">
      <defs>
        <linearGradient id="fieldBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e1314" />
          <stop offset="100%" stopColor="#080a0b" />
        </linearGradient>
        <linearGradient id="phoneScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111718" />
          <stop offset="100%" stopColor="#0a0e0f" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#fieldBg)" />
      <Chrome label="KESTREL // FIELD UNITS" right="OFFLINE · QUEUED 6" />
      <g opacity="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={i * 70} y1="34" x2={i * 70} y2="500" stroke={BONE} strokeOpacity="0.03" />
        ))}
      </g>

      {/* phone */}
      <g>
        <rect x="300" y="58" width="230" height="430" rx="26" fill="#050708" stroke={BONE} strokeOpacity="0.16" />
        <rect x="308" y="66" width="214" height="414" rx="20" fill="url(#phoneScreen)" />
        {/* status */}
        <text x="322" y="86" fontSize="6.5" fill={BONE} fillOpacity="0.4" fontFamily="monospace" letterSpacing="1">
          KESTREL
        </text>
        <text x="508" y="86" fontSize="6.5" textAnchor="end" fill={AMBER} fontFamily="monospace" letterSpacing="1">
          ● OFFLINE
        </text>
        {/* header */}
        <text x="322" y="116" fontSize="11" fill={BONE} fillOpacity="0.9" fontFamily="monospace" letterSpacing="0.6">
          SITE 07 / NORTH
        </text>
        <text x="322" y="132" fontSize="6.5" fill={BONE} fillOpacity="0.3" fontFamily="monospace" letterSpacing="1">
          6 CHECKS · 2 PHOTOS QUEUED
        </text>
        {/* cards */}
        {[
          { y: 148, t: "STRUCTURAL", s: "SEALED", c: AMBER },
          { y: 218, t: "POWER GRID", s: "PASS", c: "#6f8f7c" },
          { y: 288, t: "ACCESS ROUTE", s: "REVIEW", c: ALERT },
        ].map((card) => (
          <g key={card.t}>
            <rect x="320" y={card.y} width="190" height="58" rx="4" fill={BONE} fillOpacity="0.04" stroke={BONE} strokeOpacity="0.08" />
            <rect x="320" y={card.y} width="2" height="58" fill={card.c} />
            <text x="334" y={card.y + 20} fontSize="7.5" fill={BONE} fillOpacity="0.75" fontFamily="monospace" letterSpacing="1">
              {card.t}
            </text>
            <Bar x="334" y={card.y + 28} w="126" h={3} o={0.16} />
            <Bar x="334" y={card.y + 36} w="84" h={3} o={0.1} />
            <rect x="462" y={card.y + 12} width="38" height="13" rx="2" fill={card.c} fillOpacity="0.16" />
            <text x="481" y={card.y + 21} fontSize="5.5" textAnchor="middle" fill={card.c} fontFamily="monospace" letterSpacing="0.6">
              {card.s}
            </text>
          </g>
        ))}
        {/* photo strip */}
        <rect x="320" y="360" width="60" height="46" rx="3" fill={AMBER} fillOpacity="0.08" stroke={AMBER} strokeOpacity="0.25" />
        <path d="M334 396 l10 -12 l8 8 l7 -6 l7 10" stroke={AMBER} strokeOpacity="0.5" fill="none" />
        <rect x="386" y="360" width="60" height="46" rx="3" fill={BONE} fillOpacity="0.03" stroke={BONE} strokeOpacity="0.08" />
        <rect x="452" y="360" width="58" height="46" rx="3" fill={BONE} fillOpacity="0.03" stroke={BONE} strokeOpacity="0.08" />
        <text x="334" y="420" fontSize="6" fill={BONE} fillOpacity="0.28" fontFamily="monospace" letterSpacing="0.8">
          EVIDENCE 3/5
        </text>
        {/* cta */}
        <rect x="320" y="434" width="190" height="30" rx="3" fill={AMBER} fillOpacity="0.9" />
        <text x="415" y="453" fontSize="7.5" textAnchor="middle" fill="#0a0c0d" fontFamily="monospace" letterSpacing="1.4">
          SYNC 6 RECORDS
        </text>
        <rect x="368" y="74" width="94" height="6" rx="3" fill={BONE} fillOpacity="0.1" />
      </g>

      {/* side readouts */}
      <g>
        <text x="48" y="120" fontSize="7" letterSpacing="1.8" fill={BONE} fillOpacity="0.25" fontFamily="monospace">
          LOCAL STORE
        </text>
        <text x="48" y="152" fontSize="22" fill={BONE} fillOpacity="0.8" fontFamily="monospace">
          1,204
        </text>
        <text x="48" y="168" fontSize="6.5" fill={BONE} fillOpacity="0.28" fontFamily="monospace" letterSpacing="1">
          RECORDS HELD
        </text>
        <line x1="48" y1="194" x2="248" y2="194" stroke={BONE} strokeOpacity="0.1" />
        <text x="48" y="220" fontSize="7" letterSpacing="1.8" fill={BONE} fillOpacity="0.25" fontFamily="monospace">
          CONFLICT MERGE
        </text>
        <rect x="48" y="232" width="200" height="6" rx="3" fill={BONE} fillOpacity="0.08" />
        <rect x="48" y="232" width="164" height="6" rx="3" fill={AMBER} fillOpacity="0.55" />
        <text x="48" y="256" fontSize="7" fill={AMBER} fillOpacity="0.6" fontFamily="monospace" letterSpacing="1">
          0 RECORDS LOST
        </text>
      </g>

      <g>
        <text x="556" y="120" fontSize="7" letterSpacing="1.8" fill={BONE} fillOpacity="0.25" fontFamily="monospace">
          SYNC QUEUE
        </text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="556" y={136 + i * 34} width="188" height="26" fill={BONE} fillOpacity="0.03" stroke={BONE} strokeOpacity="0.07" />
            <circle cx="570" cy={149 + i * 34} r="2.4" fill={i === 0 ? AMBER : "#6f8f7c"} />
            <Bar x="582" y={144 + i * 34} w={[110, 84, 96, 70][i]} h={4} o={0.22} />
            <text x="734" y={152 + i * 34} fontSize="6" textAnchor="end" fill={BONE} fillOpacity="0.25" fontFamily="monospace">
              {["48%", "QUEUED", "QUEUED", "QUEUED"][i]}
            </text>
          </g>
        ))}
        <text x="556" y="300" fontSize="7" fill={BONE} fillOpacity="0.25" fontFamily="monospace" letterSpacing="1.2">
          RESUME ON SIGNAL
        </text>
        <path d="M556 320 h188" stroke={BONE} strokeOpacity="0.08" />
        <path d="M556 330 l12 6 l-12 6 l12 6 l-12 6" stroke={AMBER} strokeOpacity="0.4" fill="none" />
      </g>
    </svg>
  );
}

const registry: Record<Variant, () => React.JSX.Element> = {
  map: FleetMap,
  dashboard: ProcurementDashboard,
  chart: ClinicalChart,
  terminal: SignalConsole,
  mobile: FieldApp,
};

export function ProjectVisual({
  variant,
  className,
}: {
  variant: Variant;
  className?: string;
}) {
  const Plate = registry[variant] ?? FleetMap;
  return (
    <div className={`relative h-full w-full overflow-hidden bg-ink-900 ${className ?? ""}`}>
      <div className="absolute inset-0 transition-transform duration-[1400ms] ease-tactical group-hover:scale-[1.035]">
        <Plate />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] scanlines" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,transparent_55%,rgba(4,5,6,0.55)_100%)]" />
    </div>
  );
}
