function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    Number.parseInt(clean.slice(0, 2), 16),
    Number.parseInt(clean.slice(2, 4), 16),
    Number.parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// A soft tint of a merchant's colour, for a header background — the raw,
// full-saturation colour behind a page of text reads as harsh no matter
// which hue a merchant picks.
export function lightTint(hex: string, amount = 0.88): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * amount;
  return rgbToHex(mix(r), mix(g), mix(b));
}

// A dark shade of the same hue, readable on its own light tint — this is
// the "contrast-safe text colour auto-derived from whatever the merchant
// picks" from Part 6 §2.3, without the merchant ever choosing a second
// colour just for text.
export function darkShade(hex: string, amount = 0.6): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => c * (1 - amount);
  return rgbToHex(mix(r), mix(g), mix(b));
}
