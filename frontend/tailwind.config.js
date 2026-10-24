/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(215 27.9% 16.9%)",
        background: "hsl(224 71.4% 4.1%)",
        foreground: "hsl(210 20% 98%)",
        card: "hsl(224 71.4% 6.5%)",
        primary: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        muted: {
          DEFAULT: "hsl(215 27.9% 16.9%)",
          foreground: "hsl(217.9 10.6% 64.9%)",
        },
        accent: {
          DEFAULT: "hsl(216 34% 17%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
    },
  },
  plugins: [],
}
