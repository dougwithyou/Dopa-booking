import type { LandingPageSectionKey } from '@/types/db';

export const DEFAULT_SECTION_ORDER: LandingPageSectionKey[] = ['gallery', 'testimonials', 'about', 'extras', 'closer'];

export const SECTION_LABELS: Record<LandingPageSectionKey, string> = {
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  about: 'About',
  extras: 'Extras showcase (no prices)',
  closer: 'Closer / booking CTA',
};

// Tolerates a missing/stale section_order (e.g. rows created before this
// column existed, or saved before a section was added): keeps valid entries
// in their saved order, deduped, then slots each missing default section in
// right after the section that precedes it in DEFAULT_SECTION_ORDER (so a
// newly added "extras" lands after "about", not at the very end).
export function resolveSectionOrder(order: LandingPageSectionKey[] | null | undefined): LandingPageSectionKey[] {
  const resolved: LandingPageSectionKey[] = [];
  for (const key of order ?? []) {
    if (DEFAULT_SECTION_ORDER.includes(key) && !resolved.includes(key)) resolved.push(key);
  }
  DEFAULT_SECTION_ORDER.forEach((key, i) => {
    if (resolved.includes(key)) return;
    const prev = DEFAULT_SECTION_ORDER.slice(0, i).reverse().find((k) => resolved.includes(k));
    resolved.splice(prev ? resolved.indexOf(prev) + 1 : 0, 0, key);
  });
  return resolved;
}
