// Mirrors tailwind.config.js — kept as plain JS values for places that need a
// raw color string (StatusBar, native icons) rather than a className.
export const colors = {
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
  paper: {
    DEFAULT: "#FAF8F4",
    muted: "#F2EFE8",
  },
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
} as const;
