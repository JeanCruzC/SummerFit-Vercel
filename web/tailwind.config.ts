import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        ink: "rgb(var(--text) / <alpha-value>)",
        "ink-muted": "rgb(var(--text-secondary) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#00D084',
          600: '#00b874',
          700: '#00966',
          800: '#065f46',
          900: '#064e3b',
        },
        coral: {
          50: '#fff5f5',
          100: '#ffe5e5',
          200: '#ffd1d1',
          300: '#ffb3b3',
          400: '#ff8a8a',
          500: '#FF6B6B',
          600: '#ff5252',
          700: '#e63939',
          800: '#cc2929',
          900: '#991f1f',
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.06)"
      },
      backgroundSize: {
        "300%": "300%",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "gradient": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        }
      },
      animation: {
        "fade-up": "fade-up 600ms ease forwards",
        "fade-in": "fade-in 500ms ease forwards",
        "fade-in-up": "fade-up 800ms ease-out forwards",
        "gradient": "gradient 8s ease infinite",
        "bounce-slow": "bounce 3s infinite",
      }
    }
  },
  plugins: []
};

export default config;
