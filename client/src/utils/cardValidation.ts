import { CardState } from "@/types/card";

// Card Type Definitions
export const cardTypes: Record<string, {
  pattern: RegExp;
  logo: string;
  lengths: number[];
  cvvLength: number;
  color: string;
}> = {
  visa: {
    pattern: /^4/,
    logo: 'VISA',
    lengths: [16],
    cvvLength: 3,
    color: 'from-blue-800 to-blue-600'
  },
  mastercard: {
    pattern: /^(5[1-5]|2[2-7])/,
    logo: 'MC',
    lengths: [16],
    cvvLength: 3,
    color: 'from-red-600 to-orange-600'
  },
  amex: {
    pattern: /^3[47]/,
    logo: 'AMEX',
    lengths: [15],
    cvvLength: 4,
    color: 'from-slate-800 to-slate-600'
  },
  discover: {
    pattern: /^6(?:011|5)/,
    logo: 'DISC',
    lengths: [16],
    cvvLength: 3,
    color: 'from-orange-500 to-orange-400'
  },
  unknown: {
    pattern: /.*/, // Match anything
    logo: '?',
    lengths: [16, 17, 18, 19],
    cvvLength: 3,
    color: 'from-gray-700 to-gray-900'
  }
};

// Format card number with spaces
export const formatCardNumber = (value: string): string => {
  // Remove non-digit characters
  const digits = value.replace(/\D/g, '');
  // Add space after every 4 digits
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// Format expiry date as MM/YY
export const formatExpiry = (value: string): string => {
  // Remove non-digit characters
  const digits = value.replace(/\D/g, '');
  // Format as MM/YY
  if (digits.length > 2) {
    return digits.slice(0, 2) + '/' + digits.slice(2, 4);
  }
  return digits;
};

// Luhn Algorithm for Credit Card Validation
export const luhnCheck = (cardNumber: string): boolean => {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) return false;
  
  let sum = 0;
  let shouldDouble = false;
  
  // Loop through digits in reverse
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i));
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};

// Identify Card Type based on Number
export const identifyCardType = (cardNumber: string): string => {
  const digits = cardNumber.replace(/\D/g, '');
  
  for (const [type, props] of Object.entries(cardTypes)) {
    if (type === 'unknown') continue;
    if (props.pattern.test(digits)) {
      return type;
    }
  }
  
  return 'unknown';
};

// Validate the entire card
export const validateCard = (cardState: CardState): {
  isValid: boolean;
  errors: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  };
} => {
  const errors: {
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  } = {};
  
  let isValid = true;
  const digits = cardState.number.replace(/\D/g, '');
  
  // Validate card number
  if (!digits) {
    errors.cardNumber = 'Card number is required';
    isValid = false;
  } else if (!luhnCheck(digits)) {
    errors.cardNumber = 'Invalid card number';
    isValid = false;
  }
  
  // Validate card type and length
  const cardType = cardState.cardType;
  if (cardType && cardTypes[cardType] && digits) {
    if (!cardTypes[cardType].lengths.includes(digits.length)) {
      errors.cardNumber = `${cardTypes[cardType].logo} card should have ${cardTypes[cardType].lengths.join(' or ')} digits`;
      isValid = false;
    }
  }
  
  // Validate expiry
  if (!cardState.expiry) {
    errors.expiry = 'Expiry date is required';
    isValid = false;
  } else {
    const [month, year] = cardState.expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      errors.expiry = 'Invalid expiry date';
      isValid = false;
    } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
      errors.expiry = 'Card has expired';
      isValid = false;
    }
  }
  
  // Validate CVV
  if (!cardState.cvv) {
    errors.cvv = 'CVV is required';
    isValid = false;
  } else if (cardState.cardType && cardTypes[cardState.cardType]) {
    const expectedLength = cardTypes[cardState.cardType].cvvLength;
    if (cardState.cvv.length !== expectedLength) {
      errors.cvv = `CVV should be ${expectedLength} digits`;
      isValid = false;
    }
  }
  
  return { isValid, errors };
};
