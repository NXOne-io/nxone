import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#121712", soft: "#4A5449", faint: "#7C877B" },
        canvas: "#F6F7F4",
        line: "#E1E5DE",
        forest: { DEFAULT: "#0B3D2E", soft: "#13563F", pale: "#E8F1EC" },
        lime: { DEFAULT: "#C6F24E", deep: "#8FB61E", pale: "#F4FBDF" },
        ok: "#12805C",
        warn: "#B54708",
        bad: "#B42318"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"]
      },
      maxWidth: { page: "84rem" },
      boxShadow: { card: "0 1px 2px rgba(18,23,18,.04), 0 8px 24px -16px rgba(18,23,18,.24)" }
    }
  },
  plugins: []
} satisfies Config;
