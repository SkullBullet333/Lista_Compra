export type RGB = { r: number; g: number; b: number };
export type HSV = { h: number; s: number; v: number };

export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (!/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) return null;
  return `#${(hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex).toUpperCase()}`;
}

export function hexToRgb(hex: string): RGB {
  const value = parseInt((normalizeHex(hex) || '#000000').slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const h = !delta ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: max ? delta / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: HSV): string {
  const channel = (n: number) => {
    const k = (n + h / 60) % 6;
    return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)));
  };
  return rgbToHex({ r: channel(5), g: channel(3), b: channel(1) });
}

export function luminance(hex: string): number {
  const channels = Object.values(hexToRgb(hex)).map(n => {
    const c = n / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function colorForeground(hex: string): string {
  // Prefer white on dark selections while retaining readable text on light colors.
  return contrastRatio(hex, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#111111';
}

export function accentForeground(hex: string): string {
  // Branded controls use white on medium/dark tones, including the default
  // emerald and sky accents. Light backgrounds continue to use dark text.
  return contrastRatio(hex, '#FFFFFF') >= 3 ? '#FFFFFF' : '#111111';
}

export function mixColor(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex), b = hexToRgb(target);
  return rgbToHex({ r: a.r + (b.r - a.r) * amount, g: a.g + (b.g - a.g) * amount, b: a.b + (b.b - a.b) * amount });
}

export function accessibleAccent(hex: string, background: string): string {
  const target = colorForeground(background);
  let result = hex;
  for (let step = 1; contrastRatio(result, background) < 4.5 && step <= 20; step++) {
    result = mixColor(hex, target, step / 20);
  }
  return result;
}
