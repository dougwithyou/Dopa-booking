// Aggregation helpers for the dashboard + stats page. All aggregation
// happens in JS over already-fetched rows (small-business data volumes),
// keeping the Supabase queries simple and fully typed.

import type { EnrichedBooking } from './data';
import { monthKey } from './format';

export function isConfirmedPaid(b: EnrichedBooking): boolean {
  return b.status === 'confirmed';
}

export function inCurrentMonth(iso: string | null | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export interface RevenuePoint {
  month: string; // "2026-08"
  cents: number;
}

/** Monthly revenue from confirmed bookings, using paid_at (falls back to
 * created_at if paid_at is missing), over the trailing `months` months. */
export function monthlyRevenue(bookings: EnrichedBooking[], months = 12): RevenuePoint[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const totals: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));

  for (const b of bookings) {
    if (!isConfirmedPaid(b)) continue;
    const iso = b.paid_at ?? b.created_at;
    const key = monthKey(iso);
    if (key in totals) totals[key] += b.amount_cents;
  }

  return keys.map((k) => ({ month: k, cents: totals[k] }));
}

export function revenueThisMonth(bookings: EnrichedBooking[]): number {
  const now = new Date();
  return bookings
    .filter((b) => isConfirmedPaid(b) && inCurrentMonth(b.paid_at ?? b.created_at, now))
    .reduce((sum, b) => sum + b.amount_cents, 0);
}

export function bookingsThisMonthCount(bookings: EnrichedBooking[]): number {
  const now = new Date();
  return bookings.filter((b) => inCurrentMonth(b.created_at, now) && b.status !== 'cancelled').length;
}

export function upcomingSessionsCount(bookings: EnrichedBooking[]): number {
  const now = Date.now();
  return bookings.filter((b) => b.status === 'confirmed' && b.slot && new Date(b.slot.start_time).getTime() > now)
    .length;
}

export interface ClientTotal {
  client_id: string;
  name: string;
  email: string;
  totalCents: number;
  bookingCount: number;
  lastDate: string | null;
}

export function topClients(bookings: EnrichedBooking[], limit = 5): ClientTotal[] {
  const byClient = new Map<string, ClientTotal>();
  for (const b of bookings) {
    if (!b.client || !isConfirmedPaid(b)) continue;
    const existing = byClient.get(b.client.id);
    const date = b.slot?.start_time ?? b.paid_at ?? b.created_at;
    if (existing) {
      existing.totalCents += b.amount_cents;
      existing.bookingCount += 1;
      if (!existing.lastDate || new Date(date) > new Date(existing.lastDate)) existing.lastDate = date;
    } else {
      byClient.set(b.client.id, {
        client_id: b.client.id,
        name: b.client.name || b.client.email,
        email: b.client.email,
        totalCents: b.amount_cents,
        bookingCount: 1,
        lastDate: date,
      });
    }
  }
  return Array.from(byClient.values())
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, limit);
}

export interface SessionTypeTotal {
  landing_page_id: string | null;
  label: string;
  totalCents: number;
  bookingCount: number;
}

export function revenueBySessionType(bookings: EnrichedBooking[]): SessionTypeTotal[] {
  const by = new Map<string, SessionTypeTotal>();
  for (const b of bookings) {
    if (!isConfirmedPaid(b)) continue;
    const key = b.landing_page_id ?? 'unassigned';
    const label = b.landing_page?.headline_en?.trim() || b.landing_page?.slug || 'Unassigned';
    const existing = by.get(key);
    if (existing) {
      existing.totalCents += b.amount_cents;
      existing.bookingCount += 1;
    } else {
      by.set(key, { landing_page_id: b.landing_page_id, label, totalCents: b.amount_cents, bookingCount: 1 });
    }
  }
  return Array.from(by.values()).sort((a, b) => b.totalCents - a.totalCents);
}

export interface LocationTotal {
  location_id: string | null;
  name: string;
  bookingCount: number;
}

export function bookingsByLocation(bookings: EnrichedBooking[]): LocationTotal[] {
  const by = new Map<string, LocationTotal>();
  for (const b of bookings) {
    if (b.status === 'cancelled') continue;
    const key = b.location_id ?? 'unassigned';
    const name = b.location?.name || 'Unassigned';
    const existing = by.get(key);
    if (existing) existing.bookingCount += 1;
    else by.set(key, { location_id: b.location_id, name, bookingCount: 1 });
  }
  return Array.from(by.values()).sort((a, b) => b.bookingCount - a.bookingCount);
}

export interface HourTotal {
  hour: number; // 0-23
  label: string;
  bookingCount: number;
}

export function bookingsByHourOfDay(bookings: EnrichedBooking[]): HourTotal[] {
  const counts = new Array(24).fill(0);
  for (const b of bookings) {
    if (b.status === 'cancelled' || !b.slot) continue;
    const hour = new Date(b.slot.start_time).getHours();
    counts[hour] += 1;
  }
  return counts
    .map((bookingCount, hour) => ({
      hour,
      label: new Date(2000, 0, 1, hour).toLocaleTimeString('en-US', { hour: 'numeric' }),
      bookingCount,
    }))
    .filter((h) => h.bookingCount > 0);
}

export interface ConversionStat {
  landing_page_id: string;
  slug: string;
  label: string;
  views: number;
  bookings: number;
  rate: number; // 0-100
}

export function conversionByLandingPage(
  bookings: EnrichedBooking[],
  pageViewsByLandingPage: Record<string, number>,
  landingPages: { id: string; slug: string; headline_en: string }[]
): ConversionStat[] {
  const confirmedByPage = new Map<string, number>();
  for (const b of bookings) {
    if (!isConfirmedPaid(b) || !b.landing_page_id) continue;
    confirmedByPage.set(b.landing_page_id, (confirmedByPage.get(b.landing_page_id) ?? 0) + 1);
  }

  return landingPages
    .map((lp) => {
      const views = pageViewsByLandingPage[lp.id] ?? 0;
      const confirmed = confirmedByPage.get(lp.id) ?? 0;
      return {
        landing_page_id: lp.id,
        slug: lp.slug,
        label: lp.headline_en?.trim() || lp.slug,
        views,
        bookings: confirmed,
        rate: views > 0 ? (confirmed / views) * 100 : 0,
      };
    })
    .filter((c) => c.views > 0 || c.bookings > 0)
    .sort((a, b) => b.views - a.views);
}
