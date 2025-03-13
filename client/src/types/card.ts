export interface CardState {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  isValid: boolean | null;
  cardType: string | null;
  // Extended fields
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface ValidationErrors {
  number?: string;
  holder?: string;
  expiry?: string;
  cvv?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
}
