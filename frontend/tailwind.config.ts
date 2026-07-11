import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0E1116",
        panel: "#161A22",
        panelAlt: "#1D222C",
        border: "#2A303C",
        ink: "#E7E9EE",
        muted: "#8B93A3",
        accent: "#6C8CFF",
        accentSoft: "#26314F",
        success: "#34D399",
        warning: "#F5B942",
        danger: "#F87171",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jbmono)", "monospace"],
      },
      boxShadow: {
        node: "0 0 0 1px rgba(108,140,255,0.15), 0 8px 24px -8px rgba(0,0,0,0.5)",
      },
      backgroundImage: {
        grid:
          "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};
export default config;
