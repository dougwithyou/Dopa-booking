import type { LandingPageSectionKey } from '@/types/db';

export const DEFAULT_SECTION_ORDER: LandingPageSectionKey[] = ['gallery', 'testimonials', 'about', 'closer'];

export const SECTION_LABELS: Record<LandingPageSectionKey, string> = {
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  about: 'About',
  closer: 'Closer / booking CTA',
};

// Tolerates a missing/stale section_order (e.g. rows created before this
// column existed, or one holding a key that no longer exists): keeps valid
// entries in their saved order, then appends any default section missing
// from it, deduped.
export function resolveSectionOrder(order: LandingPageSectionKey[] | null | undefined): LandingPageSectionKey[] {
  const seen = new Set<LandingPageSectionKey>();
  const resolved: LandingPageSectionKey[] = [];
  for (const key of order ?? []) {
    if (DEFAULT_SECTION_ORDER.includes(key) && !seen.has(key)) {
      seen.add(key);
      resolved.push(key);
    }
  }
  for (const key of DEFAULT_SECTION_ORDER) {
    if (!seen.has(key)) resolved.push(key);
  }
  return resolved;
}
