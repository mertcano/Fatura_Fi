/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* TOPRAK + MINT PALETI */
        cream: {
          50: "#FAF7F2",    // ana arkaplan
          100: "#F5F0E8",
          200: "#F0E9DE",   // kart arkaplanı
          300: "#E5DCC8",
        },
        bark: {
          400: "#8B7355",
          500: "#6B5340",
          600: "#5A4232",
          700: "#4A3527",
          800: "#3D2E1F",   // ana metin
          900: "#2A1F15",
        },
        terra: {
          50:  "#FDF4ED",
          100: "#FAE7D8",
          200: "#F4CCAD",
          300: "#EBA77B",
          400: "#DD8957",
          500: "#C66B3D",   // ana vurgu
          600: "#A8552E",
          700: "#874225",
          800: "#683320",
        },
        mint: {
          50:  "#E8F8F1",
          100: "#C6EFD9",
          200: "#92E0BC",
          300: "#58CD9D",
          400: "#1FA672",
          500: "#14B981",   // crypto vurgu, başarı rengi
          600: "#0F9268",
          700: "#0A6C4E",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
        serif: ["'Instrument Serif'", "serif"],
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #C66B3D 0%, #14B981 100%)",
        "gradient-warm":  "linear-gradient(135deg, #C66B3D 0%, #A8552E 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "fade-up": "fadeUp 0.7s ease-out",
        "glow-pulse": "glowPulse 4s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "0.8" } },
        gradientShift: { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
      },
      fontSize: {
        "display-xl": ["clamp(3.5rem, 8vw, 6rem)",  { lineHeight: "0.98", letterSpacing: "-0.035em", fontWeight: "500" }],
        "display-lg": ["clamp(2.5rem, 6vw, 4.5rem)", { lineHeight: "1",    letterSpacing: "-0.03em",  fontWeight: "500" }],
        "display-md": ["clamp(2rem, 4vw, 3rem)",     { lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "500" }],
      },
    },
  },
  plugins: [],
};
