import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "!./src/app/api/**/*",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bumeran: {
          50: "#fff8f1",
          100: "#feefdc",
          200: "#fcdbb9",
          300: "#f9be8b",
          400: "#f49655",
          500: "#f07429",
          600: "#e1591f",
          700: "#bb411c",
          800: "#95351e",
          900: "#792e1c",
          950: "#41140c",
        },
        gold: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        dark: {
          950: "#090a0f",
          900: "#0f111a",
          850: "#151824",
          800: "#1c2030",
          750: "#24293e",
          700: "#2d344d",
          600: "#434d70",
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(240, 116, 41, 0.35)",
        "glow-gold": "0 0 25px -5px rgba(245, 158, 11, 0.4)",
        card: "0 8px 30px rgba(0, 0, 0, 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
