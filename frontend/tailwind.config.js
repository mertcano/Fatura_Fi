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
        purple: {
          50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe",
          400: "#c084fc", 500: "#9945FF", 600: "#7c2dff", 700: "#6b1fdb",
          800: "#5a1aab", 900: "#4a1582", 950: "#2d0a55",
        },
        mint: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
          400: "#34d399", 500: "#14F195", 600: "#00d97e", 700: "#00b067",
          800: "#008853", 900: "#066f44",
        },
        ink: {
          50: "#fafafa", 100: "#f4f4f5", 200: "#e4e4e7", 300: "#a1a1aa",
          400: "#71717a", 500: "#52525b", 600: "#3f3f46", 700: "#27272a",
          800: "#18181b", 900: "#0f0f12", 950: "#0B0B0F",
        },
        brand: {
          50: "#faf5ff", 100: "#f3e8ff", 500: "#9945FF",
          600: "#7c2dff", 700: "#6b1fdb", 900: "#4a1582",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-xl": ["clamp(3.5rem, 8vw, 7rem)", { lineHeight: "0.95", letterSpacing: "-0.04em", fontWeight: "500" }],
        "display-lg": ["clamp(2.5rem, 6vw, 5rem)", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "500" }],
        "display-md": ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.025em", fontWeight: "500" }],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-brand": "linear-gradient(135deg, #9945FF 0%, #14F195 100%)",
        "gradient-brand-text": "linear-gradient(135deg, #c084fc 0%, #14F195 50%, #c084fc 100%)",
        "gradient-mesh": "radial-gradient(at 27% 37%, hsla(269, 100%, 50%, 0.3) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(160, 90%, 50%, 0.15) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(270, 90%, 50%, 0.2) 0px, transparent 50%), radial-gradient(at 10% 90%, hsla(160, 90%, 50%, 0.1) 0px, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "fade-up": "fadeUp 0.7s ease-out",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(20px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        glowPulse: { "0%, 100%": { opacity: "0.5", filter: "blur(60px)" }, "50%": { opacity: "0.8", filter: "blur(80px)" } },
        gradientShift: { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        float: { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
      },
      boxShadow: {
        "glow-purple": "0 0 60px -10px rgba(153, 69, 255, 0.5)",
        "glow-mint": "0 0 60px -10px rgba(20, 241, 149, 0.5)",
        "glow-purple-sm": "0 0 30px -5px rgba(153, 69, 255, 0.3)",
      },
    },
  },
  plugins: [],
};
