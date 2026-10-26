import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { site } from "@/data/site";

export const alt = `${site.name} — ${site.role}. Systems that hold the line.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Share card, rendered with the same typefaces and palette as the site. */
export default async function OpengraphImage() {
  let display: ArrayBuffer | null = null;
  let mono: ArrayBuffer | null = null;

  try {
    const displayBuffer = await readFile(
      path.join(process.cwd(), "assets/fonts/barlow-condensed-latin-600-normal.woff"),
    );
    const monoBuffer = await readFile(
      path.join(process.cwd(), "assets/fonts/jetbrains-mono-latin-400-normal.woff"),
    );
    display = displayBuffer.buffer.slice(
      displayBuffer.byteOffset,
      displayBuffer.byteOffset + displayBuffer.byteLength,
    ) as ArrayBuffer;
    mono = monoBuffer.buffer.slice(
      monoBuffer.byteOffset,
      monoBuffer.byteOffset + monoBuffer.byteLength,
    ) as ArrayBuffer;
  } catch {
    display = null;
    mono = null;
  }

  const fonts = [
    ...(display
      ? [{ name: "Barlow", data: display, weight: 600 as const, style: "normal" as const }]
      : []),
    ...(mono
      ? [{ name: "JetBrains", data: mono, weight: 400 as const, style: "normal" as const }]
      : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#060708",
          padding: "56px 64px",
          position: "relative",
          fontFamily: display ? "Barlow" : "sans-serif",
        }}
      >
        {/* grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(236,231,220,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(236,231,220,0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        {/* amber glow */}
        <div
          style={{
            position: "absolute",
            right: -180,
            top: -160,
            width: 760,
            height: 760,
            display: "flex",
            background:
              "radial-gradient(circle at center, rgba(227,164,61,0.16), rgba(227,164,61,0) 64%)",
          }}
        />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 8, height: 8, background: "#e3a43d" }} />
            <div
              style={{
                display: "flex",
                fontFamily: mono ? "JetBrains" : "monospace",
                fontSize: 17,
                letterSpacing: 5,
                color: "rgba(236,231,220,0.55)",
              }}
            >
              {site.brand} · FIELD TERMINAL
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: mono ? "JetBrains" : "monospace",
              fontSize: 15,
              letterSpacing: 3,
              color: "rgba(236,231,220,0.3)",
            }}
          >
            {site.availability.toUpperCase()}
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              lineHeight: 0.86,
              letterSpacing: -2,
              color: "#ece7dc",
              textTransform: "uppercase",
            }}
          >
            SYSTEMS THAT
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              lineHeight: 0.86,
              letterSpacing: -2,
              textTransform: "uppercase",
              color: "#ece7dc",
            }}
          >
            HOLD THE LINE
            <span style={{ color: "#e3a43d" }}>.</span>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(236,231,220,0.14)",
            paddingTop: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 30, color: "#ece7dc" }}>
              {site.name.toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: mono ? "JetBrains" : "monospace",
                fontSize: 16,
                letterSpacing: 3,
                color: "rgba(236,231,220,0.4)",
              }}
            >
              {site.role.toUpperCase()} · 10 YEARS · 48 SYSTEMS
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: mono ? "JetBrains" : "monospace",
              fontSize: 16,
              letterSpacing: 3,
              color: "#e3a43d",
            }}
          >
            ENVGUARD.DEV
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
