import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#191613",
        "ink-soft": "#6b625a",
        paper: "#fbf8f3",
        surface: "#ffffff",
        sand: "#f0e9df",
        line: "#e7ddcf",
        ember: "#e2231a",
        emberdark: "#b81c16",
        moss: "#2e9e45",
        amber: "#e8920c",
        indigo: "#3b5bdb",
        violet: "#7a4ddb",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(25,22,19,.04),0 8px 24px -8px rgba(25,22,19,.12)",
        lift: "0 2px 4px rgba(25,22,19,.05),0 24px 60px -18px rgba(25,22,19,.28)",
      },
    },
  },
  plugins: [],
};
export default config;
