'use client';

import { useEffect, useRef } from 'react';

const CHECK_MS = 700;
// 4.5:1 (WCAG body-text level): the accent red only "passes" 3:1 over near
// black, which still reads poorly against a photo, so require more.
const MIN_CONTRAST = 4.5;
const LIGHT = '#ffffff';

type RGB = [number, number, number];

function luminance([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function parseColor(value: string): RGB | null {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = value.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

// Mirrors the hero's darkening gradient (Hero.tsx): rgba(20,15,12,a) with
// a = 0.15 at the top, 0.05 at 35%, 0.85 at the bottom.
function overlayAlpha(yFraction: number): number {
  if (yFraction <= 0.35) return 0.15 + (0.05 - 0.15) * (yFraction / 0.35);
  return 0.05 + (0.85 - 0.05) * ((yFraction - 0.35) / 0.65);
}

/**
 * Keeps the hero's highlighted ("duo") words legible: samples the photo
 * actually behind each word (including the hero's dark gradient), and if
 * the brand accent doesn't reach 3:1 contrast there, switches that word to
 * white — and back to the accent over light backgrounds. Re-checked as the
 * slideshow changes photos. Renders nothing; works on its parent <section>.
 */
export function HeroDuoContrast() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = markerRef.current?.closest('section');
    if (!section) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const visibleImage = (): HTMLImageElement | null => {
      const imgs = Array.from(section.querySelectorAll('img'));
      // In the slideshow the active slide's wrapper is marked data-active.
      return (
        imgs.find((img) => img.complete && img.naturalWidth > 0 && img.closest('[data-active="true"]')) ??
        imgs.find((img) => img.complete && img.naturalWidth > 0) ??
        null
      );
    };

    const check = () => {
      const img = visibleImage();
      const words = Array.from(section.querySelectorAll<HTMLElement>('.duo'));
      if (!img || words.length === 0) return;

      const box = section.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const scale = 0.25; // sample a downscaled copy — plenty for an average
      canvas.width = Math.max(1, Math.round(box.width * scale));
      canvas.height = Math.max(1, Math.round(box.height * scale));
      // object-cover placement
      const cover = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const dw = img.naturalWidth * cover;
      const dh = img.naturalHeight * cover;
      try {
        ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      } catch {
        return;
      }

      const accent = parseColor(getComputedStyle(section).getPropertyValue('--clay')) ?? [156, 74, 44];
      const light = parseColor(LIGHT)!;

      for (const word of words) {
        const r = word.getBoundingClientRect();
        const x = Math.max(0, Math.floor((r.left - box.left) * scale));
        const y = Math.max(0, Math.floor((r.top - box.top) * scale));
        const w = Math.min(canvas.width - x, Math.ceil(r.width * scale));
        const h = Math.min(canvas.height - y, Math.ceil(r.height * scale));
        if (w <= 0 || h <= 0) continue;

        let data: Uint8ClampedArray;
        try {
          data = ctx.getImageData(x, y, w, h).data;
        } catch {
          return; // cross-origin image: leave the default color
        }
        let sr = 0, sg = 0, sb = 0;
        const n = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          sr += data[i];
          sg += data[i + 1];
          sb += data[i + 2];
        }
        const a = overlayAlpha((r.top + r.height / 2 - box.top) / box.height);
        const bg: RGB = [
          (sr / n) * (1 - a) + 20 * a,
          (sg / n) * (1 - a) + 15 * a,
          (sb / n) * (1 - a) + 12 * a,
        ];

        const accentContrast = contrast(accent, bg);
        const useLight = accentContrast < MIN_CONTRAST && contrast(light, bg) > accentContrast;
        word.style.setProperty('--duo-color', useLight ? LIGHT : 'var(--clay)');
      }
    };

    check();
    const id = window.setInterval(check, CHECK_MS);
    section.addEventListener('load', check, true);
    window.addEventListener('resize', check);
    return () => {
      window.clearInterval(id);
      section.removeEventListener('load', check, true);
      window.removeEventListener('resize', check);
    };
  }, []);

  return <span ref={markerRef} hidden />;
}
