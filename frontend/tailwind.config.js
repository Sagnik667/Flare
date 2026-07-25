/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sos: {
          DEFAULT: "var(--color-sos)",
          pulse: "var(--color-sos-pulse)",
          dark: "var(--color-sos-dark)",
        },
        bg: {
          base: "var(--color-bg-base)",
          surface: "var(--color-bg-surface)",
          raised: "var(--color-bg-raised)",
          overlay: "var(--color-bg-overlay)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
          dark: "var(--color-accent-dark)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        border: {
          DEFAULT: "var(--color-border)",
          focus: "var(--color-border-focus)",
        }
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        sos: "var(--shadow-sos)",
      }
    },
  },
  plugins: [],
}
