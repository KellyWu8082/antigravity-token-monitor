import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: [
    "variant",
    [
      "@media (prefers-color-scheme: dark) { &:where(:root:not(:has(> head > meta[name=\"color-scheme\"][content=\"light\"])) *) }",
      "@media (prefers-color-scheme: dark) { :root:not(:has(> head > meta[name=\"color-scheme\"][content=\"light\"]))& }",
      "&:where(:root:has(> head > meta[name=\"color-scheme\"][content=\"dark\"]) *)",
      ":root:has(> head > meta[name=\"color-scheme\"][content=\"dark\"])&",
    ],
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-sc)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        obsidian: {
          950: "#070b14",
          900: "#0c1222",
          850: "#11192d",
          800: "#17213a",
        },
        aurora: {
          indigo: "#6366f1",
          violet: "#8b5cf6",
          cyan: "#22d3ee",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
        tight: "-0.02em",
      },
      boxShadow: {
        "glass-light":
          "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -4px rgba(15, 23, 42, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.85)",
        "glass-dark":
          "0 2px 6px rgba(2, 6, 23, 0.45), 0 16px 36px -8px rgba(2, 6, 23, 0.65), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        "glow-indigo":
          "0 8px 28px -4px rgba(99, 102, 241, 0.42), 0 0 16px -2px rgba(34, 211, 238, 0.25)",
        "glow-cyan":
          "0 8px 24px -4px rgba(34, 211, 238, 0.32), 0 0 12px -2px rgba(99, 102, 241, 0.24)",
        "card-drag":
          "0 24px 48px -12px rgba(2, 6, 23, 0.48), 0 0 0 1px rgba(99, 102, 241, 0.45), 0 0 24px -4px rgba(34, 211, 238, 0.28)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.48" },
          "50%": { opacity: "0.92" },
        },
        "node-glow": {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(99, 102, 241, 0.45)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 0 6px rgba(34, 211, 238, 0)",
            transform: "scale(1.12)",
          },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        breathe: "breathe 2.2s ease-in-out infinite",
        "node-glow": "node-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

