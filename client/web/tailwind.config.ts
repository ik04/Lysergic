import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "slow-spin": "spin 3s linear infinite",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
        pressstart: ['"Press Start 2P"', "monospace"],
        silkscreen: ['"Silkscreen"', "monospace"],
        spacegrotesk: ['"Space Grotesk"', "sans-serif"],
      },
      colors: {
        accent: "var(--color-accent)",
        accent2: "var(--color-accent2)",
        error: "var(--color-error)",
        background: "var(--color-background)",
        baseColor: "var(--color-baseColor)",
        rating: "var(--color-rating)",
      },
    },
  },
  plugins: [],
} satisfies Config;
