import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#060708",
          900: "#0a0c0d",
          850: "#0d1011",
          800: "#111516",
          700: "#171b1d",
          600: "#1e2426",
          500: "#272e30",
        },
        fog: {
          500: "#6d7473",
          400: "#8b928f",
          300: "#a8aeaa",
          200: "#c6c9c3",
        },
        bone: "#ece7dc",
        amber: {
          DEFAULT: "#e3a43d",
          400: "#eab257",
          500: "#e3a43d",
          600: "#c98a2a",
          700: "#9a6a20",
          900: "#4a3410",
        },
        alert: "#c8443a",
        signal: "#6f8f7c",
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(2.85rem, 9.2vw, 9.5rem)", { lineHeight: "0.84", letterSpacing: "-0.02em" }],
        "display-lg": ["clamp(2.8rem, 6.6vw, 6rem)", { lineHeight: "0.87", letterSpacing: "-0.015em" }],
        "display-md": ["clamp(2.1rem, 3.6vw, 3.4rem)", { lineHeight: "0.92", letterSpacing: "-0.01em" }],
        "display-sm": ["clamp(1.5rem, 2.1vw, 2rem)", { lineHeight: "1", letterSpacing: "0.005em" }],
      },
      letterSpacing: {
        hud: "0.28em",
        widest: "0.18em",
      },
      maxWidth: {
        shell: "1560px",
      },
      transitionTimingFunction: {
        tactical: "cubic-bezier(0.16, 1, 0.3, 1)",
        snap: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.82)" },
        },
        "scan-y": {
          "0%": { transform: "translateY(-8vh)", opacity: "0" },
          "8%": { opacity: "0.55" },
          "92%": { opacity: "0.55" },
          "100%": { transform: "translateY(108vh)", opacity: "0" },
        },
        "sweep-x": {
          "0%": { transform: "translateX(-30%)", opacity: "0" },
          "12%": { opacity: "0.5" },
          "88%": { opacity: "0.5" },
          "100%": { transform: "translateX(130%)", opacity: "0" },
        },
        flicker: {
          "0%, 100%": { opacity: "0.82" },
          "6%": { opacity: "0.6" },
          "7%": { opacity: "0.95" },
          "36%": { opacity: "0.78" },
          "38%": { opacity: "1" },
          "72%": { opacity: "0.7" },
        },
        "ticker": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "blink-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "drift-slow": {
          "0%": { transform: "scale(1.08) translate3d(0,0,0)" },
          "50%": { transform: "scale(1.12) translate3d(-1.4%, -1%, 0)" },
          "100%": { transform: "scale(1.08) translate3d(0,0,0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
        "scan-y": "scan-y 9s linear infinite",
        "sweep-x": "sweep-x 7s cubic-bezier(0.4,0,0.6,1) infinite",
        flicker: "flicker 7s steps(1, end) infinite",
        ticker: "ticker 42s linear infinite",
        "blink-soft": "blink-soft 2.8s ease-in-out infinite",
        "drift-slow": "drift-slow 32s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
