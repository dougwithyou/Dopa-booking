import type { CSSProperties } from 'react';
import type { LandingPageTheme } from '@/types/db';

// Brand defaults, mirroring the :root values in src/app/globals.css — used
// by the admin color pickers so "unset" shows the real fallback rather than
// an empty swatch.
export const DEFAULT_THEME_COLORS: Required<LandingPageTheme> = {
  ink: '#221c17',
  parchment: '#f3ece0',
  parchment_dim: '#e9e0d0',
  clay: '#9c4a2c',
  moss: '#5b6b4d',
  gold: '#b8873b',
  wine: '#4a2226',
};

export const THEME_COLOR_LABELS: Record<keyof LandingPageTheme, string> = {
  ink: 'Ink (body text)',
  parchment: 'Parchment (background)',
  parchment_dim: 'Parchment, dim (section background)',
  clay: 'Clay (headings, primary accent)',
  moss: 'Moss (secondary accent)',
  gold: 'Gold (highlights)',
  wine: 'Wine (dark accent)',
};

// Maps LandingPageTheme keys to the CSS custom properties they override
// (defined with their brand defaults in src/app/globals.css). Unset keys
// simply inherit the :root default, so a partial override is safe.
const CSS_VAR_BY_KEY: Record<keyof LandingPageTheme, string> = {
  ink: '--ink',
  parchment: '--parchment',
  parchment_dim: '--parchment-dim',
  clay: '--clay',
  moss: '--moss',
  gold: '--gold',
  wine: '--wine',
};

export function themeToStyle(theme: LandingPageTheme | null | undefined): CSSProperties {
  if (!theme) return {};
  const style: Record<string, string> = {};
  for (const [key, cssVar] of Object.entries(CSS_VAR_BY_KEY)) {
    const value = theme[key as keyof LandingPageTheme];
    if (value) style[cssVar] = value;
  }
  return style as CSSProperties;
}
