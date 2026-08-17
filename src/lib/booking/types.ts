export type BookingStep = 'location' | 'datetime' | 'contact' | 'checkout';

export interface HoldResponse {
  holdId: string;
  expiresAt: string;
}

export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
}
