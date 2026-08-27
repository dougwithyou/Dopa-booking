// Shared data-fetching helpers for the admin panel. Every core table
// carries studio_id, and RLS already scopes rows to the signed-in admin's
// studio — these helpers just resolve "the current studio" and stitch
// together a few hand-rolled joins (the hand-written Database type in
// src/types/db.ts has no relationship metadata, so Supabase's embedded
// `select('*, foo(*)')` joins don't type-check cleanly; plain queries +
// in-memory maps sidestep that entirely and keep everything typed).

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AvailabilitySlot,
  Booking,
  Client,
  Contract,
  Database,
  DiscountCode,
  LandingPage,
  Location,
  Product,
  UpsellOrder,
} from '@/types/db';

export type SB = SupabaseClient<Database>;

export async function getStudioId(supabase: SB): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('studio_admins')
    .select('studio_id')
    .eq('user_id', user.id)
    .single();

  if (error || !data) throw new Error('No studio found for the current admin');
  return data.studio_id;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function mapById<T extends { id: string }>(rows: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const r of rows) out[r.id] = r;
  return out;
}

export interface EnrichedBooking extends Booking {
  location: Location | null;
  landing_page: LandingPage | null;
  client: Client | null;
  slot: AvailabilitySlot | null;
}

/** Fetch every booking for a studio, hydrated with its location, landing
 * page, client, and availability slot. Used by the dashboard, calendar,
 * stats, and CRM screens. */
export async function fetchEnrichedBookings(supabase: SB, studioId: string): Promise<EnrichedBooking[]> {
  const { data: bookingsRaw } = await supabase
    .from('bookings')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });

  const bookings = bookingsRaw ?? [];
  if (bookings.length === 0) return [];

  const locationIds = uniq(bookings.map((b) => b.location_id).filter((v): v is string => !!v));
  const landingPageIds = uniq(bookings.map((b) => b.landing_page_id).filter((v): v is string => !!v));
  const clientIds = uniq(bookings.map((b) => b.client_id).filter((v): v is string => !!v));
  const slotIds = uniq(bookings.map((b) => b.slot_id).filter((v): v is string => !!v));

  const [locationsRes, landingPagesRes, clientsRes, slotsRes] = await Promise.all([
    locationIds.length ? supabase.from('locations').select('*').in('id', locationIds) : Promise.resolve({ data: [] }),
    landingPageIds.length
      ? supabase.from('landing_pages').select('*').in('id', landingPageIds)
      : Promise.resolve({ data: [] }),
    clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
    slotIds.length ? supabase.from('availability_slots').select('*').in('id', slotIds) : Promise.resolve({ data: [] }),
  ]);

  const locMap = mapById((locationsRes.data ?? []) as Location[]);
  const lpMap = mapById((landingPagesRes.data ?? []) as LandingPage[]);
  const clientMap = mapById((clientsRes.data ?? []) as Client[]);
  const slotMap = mapById((slotsRes.data ?? []) as AvailabilitySlot[]);

  return bookings.map((b) => ({
    ...b,
    location: b.location_id ? locMap[b.location_id] ?? null : null,
    landing_page: b.landing_page_id ? lpMap[b.landing_page_id] ?? null : null,
    client: b.client_id ? clientMap[b.client_id] ?? null : null,
    slot: b.slot_id ? slotMap[b.slot_id] ?? null : null,
  }));
}

export interface EnrichedUpsellOrder extends UpsellOrder {
  product: Product | null;
  booking: Booking | null;
  client: Client | null;
}

/** Every paid upsell order for a studio (photobooks, prints, etc. bought
 * after checkout), hydrated with the product, booking, and client — the
 * "what do I still need to hand over" list. `upsell_orders` has no
 * studio_id of its own, so this scopes through the studio's bookings. */
export async function fetchEnrichedUpsellOrders(supabase: SB, studioId: string): Promise<EnrichedUpsellOrder[]> {
  const { data: bookingsRaw } = await supabase.from('bookings').select('*').eq('studio_id', studioId);
  const bookings = bookingsRaw ?? [];
  if (bookings.length === 0) return [];
  const bookingMap = mapById(bookings);
  const bookingIds = bookings.map((b) => b.id);

  const { data: ordersRaw } = await supabase
    .from('upsell_orders')
    .select('*')
    .in('booking_id', bookingIds)
    .eq('status', 'paid')
    .order('created_at', { ascending: false });
  const orders = ordersRaw ?? [];
  if (orders.length === 0) return [];

  const productIds = uniq(orders.map((o) => o.product_id));
  const clientIds = uniq(
    orders.map((o) => bookingMap[o.booking_id]?.client_id).filter((v): v is string => !!v)
  );

  const [productsRes, clientsRes] = await Promise.all([
    productIds.length ? supabase.from('products').select('*').in('id', productIds) : Promise.resolve({ data: [] }),
    clientIds.length ? supabase.from('clients').select('*').in('id', clientIds) : Promise.resolve({ data: [] }),
  ]);

  const productMap = mapById((productsRes.data ?? []) as Product[]);
  const clientMap = mapById((clientsRes.data ?? []) as Client[]);

  return orders.map((o) => {
    const booking = bookingMap[o.booking_id] ?? null;
    return {
      ...o,
      product: productMap[o.product_id] ?? null,
      booking,
      client: booking?.client_id ? clientMap[booking.client_id] ?? null : null,
    };
  });
}

export interface EnrichedContract extends Contract {
  client: Client | null;
}

export async function fetchEnrichedContracts(supabase: SB, studioId: string): Promise<EnrichedContract[]> {
  const { data: contractsRaw } = await supabase
    .from('contracts')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  const contracts = contractsRaw ?? [];
  if (contracts.length === 0) return [];

  const clientIds = uniq(contracts.map((c) => c.client_id).filter((v): v is string => !!v));
  const { data: clientsRaw } = clientIds.length
    ? await supabase.from('clients').select('*').in('id', clientIds)
    : { data: [] as Client[] };
  const clientMap = mapById((clientsRaw ?? []) as Client[]);

  return contracts.map((c) => ({ ...c, client: c.client_id ? clientMap[c.client_id] ?? null : null }));
}

export async function getLocations(supabase: SB, studioId: string): Promise<Location[]> {
  const { data } = await supabase.from('locations').select('*').eq('studio_id', studioId).order('name');
  return data ?? [];
}

export async function getLandingPages(supabase: SB, studioId: string): Promise<LandingPage[]> {
  const { data } = await supabase
    .from('landing_pages')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getProducts(supabase: SB, studioId: string): Promise<Product[]> {
  const { data } = await supabase.from('products').select('*').eq('studio_id', studioId).order('name');
  return data ?? [];
}

export async function getDiscountCodes(supabase: SB, studioId: string): Promise<DiscountCode[]> {
  const { data } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('studio_id', studioId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getClients(supabase: SB, studioId: string): Promise<Client[]> {
  const { data } = await supabase.from('clients').select('*').eq('studio_id', studioId).order('name');
  return data ?? [];
}

/** Landing page label used anywhere we need a compact "session type" name. */
export function landingPageLabel(lp: LandingPage | null | undefined): string {
  if (!lp) return 'Unassigned';
  return lp.headline_en?.trim() || lp.slug;
}
