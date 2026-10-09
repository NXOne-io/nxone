import type { TemplateId } from "./types";

/**
 * Four genuinely different documents, not one document with four colour schemes. They differ in
 * typeface, in where the header sits, in how the table is drawn and in how tightly it is set.
 * One set of options drives both the preview and the PDF, so what you choose is what prints.
 */
export interface TemplateConfig {
  id: TemplateId;
  name: string;
  description: string;
  /** band: a colour strip across the top. rule: a thick line under the header. stack: name and title centred. plain: neither. */
  header: "band" | "rule" | "stack" | "plain";
  titleSide: "left" | "right" | "center";
  /** filled: coloured heading row. ruled: lines only. clean: one line under the headings. */
  table: "filled" | "ruled" | "clean";
  /** Alternate row shading, which helps on long itemised bills. */
  zebra: boolean;
  /** Screen font stack and the matching PDF base font. */
  font: "serif" | "sans";
  pdfFont: "times" | "helvetica";
  /** Multiplies text size and row height. */
  scale: number;
  /** Extra breathing room between blocks, as a multiplier. */
  air: number;
  useAccent: boolean;
  caps: boolean;
  /** Title size relative to the rest. */
  titleScale: number;
  /** Letter spacing on the title, in em. */
  titleTracking: number;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "classic", name: "Classic", description: "Serif type, ruled header, solid table. The one an accountant expects.",
    header: "rule", titleSide: "right", table: "filled", zebra: false, font: "serif", pdfFont: "times",
    scale: 1, air: 1, useAccent: true, caps: true, titleScale: 1.35, titleTracking: 0
  },
  {
    id: "modern", name: "Modern", description: "Colour band, title first, wide spacing and clean lines.",
    header: "band", titleSide: "left", table: "clean", zebra: false, font: "sans", pdfFont: "helvetica",
    scale: 1.04, air: 1.35, useAccent: true, caps: false, titleScale: 1.7, titleTracking: -0.02
  },
  {
    id: "minimal", name: "Minimal", description: "No colour, centred name, hairlines and a lot of air.",
    header: "stack", titleSide: "center", table: "ruled", zebra: false, font: "sans", pdfFont: "helvetica",
    scale: 0.98, air: 1.5, useAccent: false, caps: true, titleScale: 1, titleTracking: 0.18
  },
  {
    id: "compact", name: "Compact", description: "Small serif type, shaded rows, fits a long bill on one page.",
    header: "plain", titleSide: "right", table: "ruled", zebra: true, font: "serif", pdfFont: "times",
    scale: 0.85, air: 0.7, useAccent: true, caps: true, titleScale: 1.2, titleTracking: 0
  }
];

export const templateConfig = (id: TemplateId | undefined) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
