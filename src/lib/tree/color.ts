/**
 * Deterministic category -> color mapping. No hardcoded bucket list: any
 * category string the AI returns hashes to a stable hue, so the same
 * category always renders the same color within (and across) a tree, and
 * the palette adapts automatically to whatever framework the AI selects.
 */

export function hashCategoryToHue(category: string): number {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash << 5) - hash + category.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash) % 360;
}

export interface CategoryColors {
  border: string;
  background: string;
  text: string;
  hue: number;
}

const LIGHT_THEME = { bgSaturation: 72, bgLightness: 94, borderLightness: 55, textLightness: 28 };
const DARK_THEME = { bgSaturation: 45, bgLightness: 20, borderLightness: 55, textLightness: 88 };

export function getCategoryColors(category: string, theme: "light" | "dark"): CategoryColors {
  const hue = hashCategoryToHue(category);
  const palette = theme === "dark" ? DARK_THEME : LIGHT_THEME;
  return {
    hue,
    background: `hsl(${hue}, ${palette.bgSaturation}%, ${palette.bgLightness}%)`,
    border: `hsl(${hue}, 65%, ${palette.borderLightness}%)`,
    text: `hsl(${hue}, 45%, ${palette.textLightness}%)`,
  };
}
