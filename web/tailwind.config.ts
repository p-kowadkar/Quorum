import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // light, stripe-clean canvas
        ink: "#FBFBFC", // page background
        surface: "#FFFFFF", // cards
        line: "#E8EAEE", // hairline borders
        fg: "#0B0D12", // primary text
        muted: "#5A6472", // secondary text
        // signal accents (tuned for AA on the light canvas)
        alert: "#B45309", // degraded / amber
        resolve: "#047857", // mitigated / green
        // contained dark demo panel
        panel: "#0B0D12",
        "panel-line": "#23262E",
        "panel-fg": "#E7E9EC",
        "panel-muted": "#9BA1AB",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Geist"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      maxWidth: { content: "72rem" },
      borderRadius: { card: "1rem", pill: "999px" },
      boxShadow: {
        card: "0 1px 2px rgba(11,13,18,0.04), 0 10px 30px rgba(11,13,18,0.06)",
        panel: "0 30px 80px -20px rgba(11,13,18,0.45)",
      },
      letterSpacing: { tightish: "-0.02em", tighter2: "-0.035em" },
    },
  },
  plugins: [],
} satisfies Config;
