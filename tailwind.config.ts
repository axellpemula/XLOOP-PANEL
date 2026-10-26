import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        glass: "var(--glass)",
        "glass-strong": "var(--glass-strong)",
        "glass-table": "var(--glass-table)",
        "glass-border": "var(--glass-border)",
        "glass-highlight": "var(--glass-highlight)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        active: "var(--active)",
        expired: "var(--expired)",
        banned: "var(--banned)",
        "input-bg": "var(--input-bg)",
        solid: "var(--solid)",
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "12px",
        shell: "16px",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        label: ["12px", { lineHeight: "16px" }],
        body: ["14px", { lineHeight: "20px" }],
        title: ["20px", { lineHeight: "28px" }],
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        toastProgress: {
          from: { transform: "scaleX(1)" },
          to: { transform: "scaleX(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulseSoft 1.6s ease-in-out infinite",
        "toast-progress": "toastProgress 4s linear forwards",
      },
    },
  },
  plugins: [],
};

export default config;
