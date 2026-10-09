/** Colour sets for documents. The accent carries the title, rules and table heading. */
export interface Palette { id: string; name: string; accent: string; soft: string }

export const PALETTES: Palette[] = [
  { id: "forest", name: "Forest", accent: "#0B3D2E", soft: "#E8F1EC" },
  { id: "ink", name: "Ink", accent: "#101828", soft: "#EEF0F4" },
  { id: "indigo", name: "Indigo", accent: "#3538CD", soft: "#EBECFD" },
  { id: "teal", name: "Teal", accent: "#0E7490", soft: "#E3F2F6" },
  { id: "plum", name: "Plum", accent: "#6B2D5C", soft: "#F5EAF2" },
  { id: "rust", name: "Rust", accent: "#9A3412", soft: "#FBEDE7" },
  { id: "amber", name: "Amber", accent: "#B45309", soft: "#FCF1E2" },
  { id: "slate", name: "Slate", accent: "#334155", soft: "#EDF1F5" }
];

export const paletteFor = (accent: string | undefined) => PALETTES.find((p) => p.accent.toLowerCase() === (accent ?? "").toLowerCase());
