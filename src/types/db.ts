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

export type GalleryPhoto = {
  url: string;
  tag_en: string;
  tag_es: string;
  order: number;
};

export type Testimonial = {
  quote_en: string;
  quote_es: string;
  author: string;
  order: number;
};

export type LandingPageTheme = {
  primary_color?: string;
  accent_color?: string;
  ink_color?: string;
  parchment_color?: string;
};

export type LandingPageStatus = 'draft' | 'published' | 'archived';

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

  gallery_heading_en: string | null; gallery_heading_es: string | null;
  about_heading_en: string | null; about_heading_es: string | null;
  about_body_en: string | null; about_body_es: string | null;

  closer_heading_en: string | null; closer_heading_es: string | null;
  closer_body_en: string | null; closer_body_es: string | null;

  hero_image_url: string | null;
  gallery: GalleryPhoto[];
  testimonials: Testimonial[];
  theme: LandingPageTheme;

  base_price_cents: number | null;
  currency: string;
  meta_pixel_id: string | null;
  discount_code_id: string | null;
  custom_domain: string | null;

  created_at: string;
  updated_at: string;
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
  created_at: string;
};

export type PageView = {
  id: string;
  landing_page_id: string;
  promo_param: string | null;
  locale: string | null;
  created_at: string;
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
