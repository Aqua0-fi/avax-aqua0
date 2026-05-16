import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aqua0 palette — mirrors the production web-app design tokens.
        cyan: {
          DEFAULT: "#7FE5E5",
          dim: "#5dd4d4",
        },
        // Solid surface for "primary content" cards. Distinct from the
        // semi-transparent bg-white/[0.0xx] glassy variants used for
        // subtle/accent cards.
        card: "#0d0d0d",
        // Map the page background to a Tailwind utility so stat strips
        // and other "inverted-gap" patterns can reference it explicitly.
        background: "#0a0a0a",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        // Mono numerals for balances, addresses, deltas. Falls back to the
        // platform monospace if Geist Mono isn't loaded.
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
