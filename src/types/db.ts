// Hand-written types mirroring supabase/migrations/0001_init.sql.
// Once the project is linked to a real Supabase instance, regenerate with:
//   supabase gen types typescript --project-id <id> > src/types/db.ts
// and re-apply the `export type { ... }` aliases below if you keep them.

export type Locale = 'en' | 'es';

export interface Studio {
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
}

export interface StudioAdmin {
  user_id: string;
  studio_id: string;
  role: 'owner' | 'staff';
  created_at: string;
}

export interface Location {
  id: string;
  studio_id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryPhoto {
  url: string;
  tag_en: string;
  tag_es: string;
  order: number;
}

export interface Testimonial {
  quote_en: string;
  quote_es: string;
  author: string;
  order: number;
}

export interface LandingPageTheme {
  primary_color?: string;
  accent_color?: string;
  ink_color?: string;
  parchment_color?: string;
}

export type LandingPageStatus = 'draft' | 'published' | 'archived';

export interface LandingPage {
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
}

export interface AvailabilitySlot {
  id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  is_blocked: boolean;
  created_at: string;
}

export interface Hold {
  id: string;
  slot_id: string;
  client_email: string | null;
  client_name: string | null;
  client_phone: string | null;
  landing_page_id: string | null;
  expires_at: string;
  released: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  studio_id: string;
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface DiscountCode {
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
}

export interface ProductImage {
  url: string;
  order: number;
}

export interface Product {
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
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentMethod = 'stripe' | 'cash' | 'other';

export interface Booking {
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
}

export type UpsellOrderStatus = 'pending' | 'paid' | 'cancelled';

export interface UpsellOrder {
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
}

export interface PageView {
  id: string;
  landing_page_id: string;
  promo_param: string | null;
  locale: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      studios: { Row: Studio; Insert: Partial<Studio>; Update: Partial<Studio> };
      studio_admins: { Row: StudioAdmin; Insert: Partial<StudioAdmin>; Update: Partial<StudioAdmin> };
      locations: { Row: Location; Insert: Partial<Location>; Update: Partial<Location> };
      landing_pages: { Row: LandingPage; Insert: Partial<LandingPage>; Update: Partial<LandingPage> };
      landing_page_locations: {
        Row: { landing_page_id: string; location_id: string };
        Insert: { landing_page_id: string; location_id: string };
        Update: { landing_page_id?: string; location_id?: string };
      };
      availability_slots: { Row: AvailabilitySlot; Insert: Partial<AvailabilitySlot>; Update: Partial<AvailabilitySlot> };
      holds: { Row: Hold; Insert: Partial<Hold>; Update: Partial<Hold> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      discount_codes: { Row: DiscountCode; Insert: Partial<DiscountCode>; Update: Partial<DiscountCode> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      landing_page_products: {
        Row: { landing_page_id: string; product_id: string };
        Insert: { landing_page_id: string; product_id: string };
        Update: { landing_page_id?: string; product_id?: string };
      };
      bookings: { Row: Booking; Insert: Partial<Booking>; Update: Partial<Booking> };
      upsell_orders: { Row: UpsellOrder; Insert: Partial<UpsellOrder>; Update: Partial<UpsellOrder> };
      page_views: { Row: PageView; Insert: Partial<PageView>; Update: Partial<PageView> };
    };
  };
}
