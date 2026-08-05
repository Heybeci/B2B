/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Warm charcoal/ink — replaces flat black for a softer, more refined dark tone.
        ink: {
          50: "#F5F4F2",
          100: "#E8E6E1",
          200: "#D3CFC6",
          300: "#B3AC9E",
          400: "#8C8271",
          500: "#6B6252",
          600: "#4F483C",
          700: "#3A342B",
          800: "#26221C",
          900: "#18150F",
          950: "#100E0A",
        },
        // Warm ivory background instead of pure white.
        paper: {
          DEFAULT: "#FAF8F4",
          muted: "#F2EFE8",
        },
        // Brass/gold accent — the single accent color, used sparingly.
        brass: {
          50: "#FAF3E6",
          100: "#F2E3C2",
          200: "#E4C787",
          300: "#D2AA5C",
          400: "#B8903F",
          500: "#9C7830",
          600: "#7C5F26",
          700: "#5E481D",
        },
        // stonegroup.com.tr's "sand" token — used as an accent/illustration
        // color (bg.svg's line art is drawn in exactly this color), never as
        // the page's own fill or the art disappears into it.
        sand: "#DFCDBE",
        // stonegroup.com.tr's actual <body> background ("light-sand") — one
        // shade lighter than "sand" so the sand-colored bg.svg art reads as a
        // visible watermark instead of blending into an identical fill.
        "light-sand": "#F7F2EE",
      },
      // Single Poppins family for the whole app — "serif" is not a different
      // typeface, just the heavier (SemiBold) Poppins weight used for
      // headings (Heading/SectionTitle), matching the old Inter/Playfair
      // regular-vs-display-weight split without introducing a second font.
      fontFamily: {
        sans: ["Poppins"],
        serif: ["Poppins_600SemiBold"],
      },
    },
  },
  plugins: [],
};
