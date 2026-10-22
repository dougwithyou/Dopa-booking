import type { LandingPage } from '@/types/db';

export type PartySizeRule = Pick<LandingPage, 'included_people' | 'extra_person_price_cents' | 'max_people'>;

/** People beyond the ones the base price covers. */
export function extraPeople(partySize: number, rule: PartySizeRule): number {
  return Math.max(0, partySize - rule.included_people);
}

/** Surcharge in cents for a party of `partySize` (0 when within the included count). */
export function extraPeopleCents(partySize: number, rule: PartySizeRule): number {
  return extraPeople(partySize, rule) * Math.max(0, rule.extra_person_price_cents);
}
