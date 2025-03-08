export interface CardState {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  isValid: boolean | null;
  cardType: string | null;
}
