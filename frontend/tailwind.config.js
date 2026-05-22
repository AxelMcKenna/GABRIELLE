/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        charcoal: {
          DEFAULT: "#1a1a1a",
          900: "#0d0d0d",
          800: "#1a1a1a",
          700: "#2a2a2a",
          600: "#3d3d3d",
        },
        // Safety / search-and-rescue palette.
        // `signal` = 2degrees electric blue (brand / operational accent).
        // `rescue` = pure red, reserved for casualty / emergency states only.
        // `hazard` = high-vis yellow for caution / mid-interest tiles.
        signal: {
          DEFAULT: "#1E55E8",   // 2degrees blue
          dark:    "#1340BA",
          light:   "#5B83FF",
        },
        rescue: {
          DEFAULT: "#E63946",
          dark:    "#B91C2A",
          light:   "#FF5868",
        },
        hazard: {
          DEFAULT: "#FFC72C",   // safety yellow
          dark:    "#D6A415",
          light:   "#FFD75D",
        },
      },
      letterSpacing: {
        widest: "0.2em",
        "ultra": "0.32em",
      },
    },
  },
  plugins: [],
};
