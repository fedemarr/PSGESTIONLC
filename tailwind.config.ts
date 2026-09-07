import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        azul: { DEFAULT: "#1F4E79", med: "#2E75B6", clr: "#BDD7EE" },
        verde: { DEFAULT: "#375623", clr: "#E2EFDA" },
        rojo: { DEFAULT: "#C00000", clr: "#FCE4D6" },
        amarillo: "#FFF2CC",
        naranja: "#843C0C",
        grisfondo: "#F4F6F8",
        mp: { DEFAULT: "#009EE3", clr: "#E8F6FD" },
        gsab: { DEFAULT: "#1F4E79", bg: "#D9E1F2" },
        gmc: { DEFAULT: "#375623", bg: "#E2EFDA" },
        gwh: { DEFAULT: "#843C0C", bg: "#FCE4D6" },
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
