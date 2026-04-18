import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B4FD8",
        accent: "#00C896",
        danger: "#FF4D6D",
        background: "#0A0F1E",
        surface: "#111827",
        surface2: "#1F2937",
      },
      fontFamily: {
        display: ["var(--font-sora)", "Sora", "sans-serif"],
        body: ["var(--font-dm-sans)", "DM Sans", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #1B4FD8, #00C896)",
      },
    },
  },
  plugins: [],
};

export default config;
