import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem", xl: "2.5rem" },
      screens: { "2xl": "1440px" },
    },
    screens: {
      xs: "390px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1440px",
      "2xl": "1920px",
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#e3eef1", 100: "#bdd5dc", 500: "#062531", 600: "#051d27", 700: "#04161d",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          500: "#C3202F", 600: "#A51B27",
        },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
      },
      fontFamily: { sans: ["Roboto", "system-ui", "sans-serif"] },
      fontSize: {
        display: ["3.75rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "800" }],
        h1: ["3rem", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        h2: ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.01em", fontWeight: "700" }],
        h3: ["1.75rem", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        h4: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
        h5: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        h6: ["1rem", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.55" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(15,32,40,0.07), 0 1px 2px -1px rgba(15,32,40,0.06)",
        "card-hover": "0 12px 32px -8px rgba(6,37,49,0.18), 0 4px 12px -4px rgba(15,32,40,0.08)",
        elevated: "0 20px 48px -12px rgba(6,37,49,0.22)",
        glow: "0 0 0 4px rgba(195,32,47,0.12)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #062531 0%, #C3202F 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(6,37,49,0.08) 0%, rgba(195,32,47,0.08) 100%)",
        /* Dark hero overlay: readable white text over video */
        "hero-overlay":
          "linear-gradient(135deg, rgba(4,20,26,0.93) 0%, rgba(6,37,49,0.85) 48%, rgba(124,26,38,0.80) 100%)",
        "hero-overlay-v":
          "linear-gradient(180deg, rgba(4,20,26,0.55) 0%, rgba(4,20,26,0.88) 100%)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
