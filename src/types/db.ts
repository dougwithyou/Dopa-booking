// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   supabase gen types typescript --project-id <id> > src/types/db.ts
// and re-apply the `export type { ... }` aliases below if you keep them.

export type Locale = 'en' | 'es';

export type Studio = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  default_locale: Locale;
  timezone: string;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_onboarding_started_at: string | null;
  meta_pixel_id: string | null;
  custom_domain: string | null;
  hold_duration_minutes: number;
  provider_signer_name: string | null;
  provider_signature_url: string | null;
  created_at: string;
  updated_at: string;
};

export type StudioAdmin = {
  user_id: string;
  studio_id: string;
  role: 'owner' | 'staff';
  created_at: string;
};

export type Location = {
  id: string;
  studio_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Point of a photo (percent of width / height, 0-100) to keep in frame when it's cropped to fit. */
export type FocalPoint = { x: number; y: number };

export type GalleryPhoto = {
  url: string;
  tag_en: string;
  tag_es: string;
  order: number;
  /** Focal point in percent; missing on photos uploaded before it existed (= center). */
  focal_x?: number;
  focal_y?: number;
};

export type Testimonial = {
  quote_en: string;
  quote_es: string;
  author: string;
  order: number;
};

// Keys mirror the CSS custom properties defined in src/app/globals.css.
// Any key left unset here falls back to that brand default.
export type LandingPageTheme = {
  ink?: string;
  parchment?: string;
  parchment_dim?: string;
  clay?: string;
  moss?: string;
  gold?: string;
  wine?: string;
};

export type LandingPageStatus = 'draft' | 'published' | 'archived';

// Hero and Footer are fixed as the first/last elements; only these four are
// reorderable from the admin.
export type LandingPageSectionKey = 'gallery' | 'testimonials' | 'about' | 'extras' | 'closer';

export type LandingPage = {
  id: string;
  studio_id: string;
  slug: string;
  template: string;
  status: LandingPageStatus;

  eyebrow_en: string | null; eyebrow_es: string | null;
  headline_en: string; headline_es: string;
  subheadline_en: string | null; subheadline_es: string | null;
  cta_primary_en: string | null; cta_primary_es: string | null;
  cta_secondary_en: string | null; cta_secondary_es: string | null;

  gallery_eyebrow_en: string | null; gallery_eyebrow_es: string | null;
  gallery_heading_en: string | null; gallery_heading_es: string | null;
  about_heading_en: string | null; about_heading_es: string | null;
  about_body_en: string | null; about_body_es: string | null;

  closer_heading_en: string | null; closer_heading_es: string | null;
  closer_body_en: string | null; closer_body_es: string | null;

  hero_image_url: string | null;
  hero_focal_x: number;
  hero_focal_y: number;
  about_image_url: string | null;
  background_music_url: string | null;
  gallery: GalleryPhoto[];
  testimonials: Testimonial[];
  theme: LandingPageTheme;
  section_order: LandingPageSectionKey[];

  base_price_cents: number | null;
  /** People covered by base_price_cents; each extra person adds extra_person_price_cents. */
  /** Show the session price on the landing page's closer ticket. */
  show_price: boolean;
  included_people: number;
  extra_person_price_cents: number;
  max_people: number;
  currency: string;
  meta_pixel_id: string | null;
  discount_code_id: string | null;
  custom_domain: string | null;

  created_at: string;
  updated_at: string;
};

/** One landing page's booking funnel (admin_booking_funnel, migration 0021). */
export type FunnelRow = {
  landing_page_id: string;
  views: number;
  unique_visitors: number;
  book_clicks: number;
  unique_clickers: number;
  checkouts_started: number;
  bookings: number;
};

/** A bookable slot as the public booking flow sees it (see migration 0015). */
export type PublicSlot = {
  id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  /** false while another client holds it at checkout or it's booked. */
  available: boolean;
};

export type AvailabilitySlot = {
  id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  is_blocked: boolean;
  created_at: string;
};

export type Hold = {
  id: string;
  slot_id: string;
  client_email: string | null;
  client_name: string | null;
  client_phone: string | null;
  landing_page_id: string | null;
  expires_at: string;
  released: boolean;
  /** Visitor's language at checkout, for the abandoned-cart email. */
  locale: string | null;
  abandoned_email_sent_at: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  studio_id: string;
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscountType = 'percent' | 'fixed';

export type DiscountCode = {
  id: string;
  studio_id: string;
  code: string;
  type: DiscountType;
  value: number;
  currency: string;
  expires_at: string | null;
  landing_page_id: string | null;
  promo_param: string | null;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
};

export type ProductImage = {
  url: string;
  order: number;
};

export type Product = {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  name_es: string | null;
  description_es: string | null;
  price_cents: number;
  currency: string;
  images: ProductImage[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash' | 'other';

export type Booking = {
  id: string;
  studio_id: string;
  landing_page_id: string | null;
  location_id: string | null;
  slot_id: string | null;
  client_id: string | null;
  status: BookingStatus;
  amount_cents: number;
  currency: string;
  discount_code_id: string | null;
  payment_method: PaymentMethod;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
  /** How many people the client said are coming (null for older/manual bookings). */
  party_size: number | null;
  /** Surcharge for people beyond the page's included_people (part of amount_cents). */
  extra_people_cents: number;
  cancelled_at: string | null;
  refunded_at: string | null;
  refund_amount_cents: number | null;
  stripe_refund_id: string | null;
  source_promo_param: string | null;
  admin_note: string | null;
  created_by_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsellOrderStatus = 'pending' | 'paid' | 'cancelled';

export type UpsellOrder = {
  id: string;
  booking_id: string;
  product_id: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  status: UpsellOrderStatus;
  fulfilled_at: string | null;
  refunded_at: string | null;
  created_at: string;
};

export type PageView = {
  id: string;
  landing_page_id: string;
  promo_param: string | null;
  locale: string | null;
  /** 'view' = landing page rendered, 'book_click' = booking flow opened. */
  event: 'view' | 'book_click';
  /** Anonymous random id from the visitor cookie, for unique counts. */
  visitor_id: string | null;
  created_at: string;
};

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'void';

export type Contract = {
  id: string;
  studio_id: string;
  client_id: string | null;
  booking_id: string | null;
  status: ContractStatus;
  public_token: string;
  title: string;
  content: string;
  pdf_url: string | null;
  signer_name: string | null;
  signer_email: string | null;
  signer_id_number: string | null;
  signature_data: string | null;
  signer_ip: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
};

// `@supabase/supabase-js`'s generic client infers row/insert/update types
// from `Database['public']['Tables'][name]`, which must structurally match
// its internal `GenericTable` (Row/Insert/Update/Relationships) — and the
// client generic itself expects sibling `Views`/`Functions`/`Enums`/
// `CompositeTypes` keys on the schema object. Omitting any of these makes
// every `.select()`/`.insert()` call infer `never`. Keep this shape if you
// regenerate via `supabase gen types typescript` later — it emits the same
// structure.
type Relationships = [];

export interface Database {
  // Recent @supabase/supabase-js (2.5x+) reads this marker to resolve the
  // Postgrest client's version-specific generics; without it every table's
  // Row/Insert/Update types collapse to `never`.
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      studios: { Row: Studio; Insert: Partial<Studio>; Update: Partial<Studio>; Relationships: Relationships };
      studio_admins: { Row: StudioAdmin; Insert: Partial<StudioAdmin>; Update: Partial<StudioAdmin>; Relationships: Relationships };
      locations: { Row: Location; Insert: Partial<Location>; Update: Partial<Location>; Relationships: Relationships };
      landing_pages: { Row: LandingPage; Insert: Partial<LandingPage>; Update: Partial<LandingPage>; Relationships: Relationships };
      landing_page_locations: {
        Row: { landing_page_id: string; location_id: string };
        Insert: { landing_page_id: string; location_id: string };
        Update: { landing_page_id?: string; location_id?: string };
        Relationships: Relationships;
      };
      availability_slots: { Row: AvailabilitySlot; Insert: Partial<AvailabilitySlot>; Update: Partial<AvailabilitySlot>; Relationships: Relationships };
      holds: { Row: Hold; Insert: Partial<Hold>; Update: Partial<Hold>; Relationships: Relationships };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client>; Relationships: Relationships };
      discount_codes: { Row: DiscountCode; Insert: Partial<DiscountCode>; Update: Partial<DiscountCode>; Relationships: Relationships };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product>; Relationships: Relationships };
      landing_page_products: {
        Row: { landing_page_id: string; product_id: string };
        Insert: { landing_page_id: string; product_id: string };
        Update: { landing_page_id?: string; product_id?: string };
        Relationships: Relationships;
      };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking>; Relationships: Relationships };
      upsell_orders: { Row: UpsellOrder; Insert: Partial<UpsellOrder>; Update: Partial<UpsellOrder>; Relationships: Relationships };
      page_views: { Row: PageView; Insert: Partial<PageView>; Update: Partial<PageView>; Relationships: Relationships };
      contracts: { Row: Contract; Insert: Partial<Contract>; Update: Partial<Contract>; Relationships: Relationships };
    };
    Views: Record<string, never>;
    Functions: {
      slot_is_available: {
        Args: { p_slot_id: string };
        Returns: boolean;
      };
      is_studio_admin: {
        Args: { p_studio_id: string };
        Returns: boolean;
      };
      admin_booking_funnel: {
        Args: { p_since: string };
        Returns: FunnelRow[];
      };
      public_slot_availability: {
        Args: { p_location_id: string; p_from: string; p_to: string };
        Returns: PublicSlot[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
