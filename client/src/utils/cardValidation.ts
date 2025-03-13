import { CardState, ValidationErrors } from "@/types/card";

// Card Type Definitions with expanded bank information
export const cardTypes: Record<string, {
  pattern: RegExp;
  logo: string;
  bankName?: string;
  bankLogo?: string;
  backgroundStyle?: string;
  lengths: number[];
  cvvLength: number;
  color: string;
}> = {
  visa: {
    pattern: /^4/,
    logo: 'VISA',
    bankName: 'Visa',
    backgroundStyle: 'bg-gradient-to-r from-blue-600 to-blue-800',
    lengths: [16],
    cvvLength: 3,
    color: 'from-blue-800 to-blue-600'
  },
  mastercard: {
    pattern: /^(5[1-5]|2[2-7])/,
    logo: 'MC',
    bankName: 'Mastercard',
    backgroundStyle: 'bg-gradient-to-r from-red-600 to-red-800',
    lengths: [16],
    cvvLength: 3,
    color: 'from-red-600 to-orange-600'
  },
  amex: {
    pattern: /^3[47]/,
    logo: 'AMEX',
    bankName: 'American Express',
    backgroundStyle: 'bg-gradient-to-r from-slate-600 to-slate-800',
    lengths: [15],
    cvvLength: 4,
    color: 'from-slate-800 to-slate-600'
  },
  discover: {
    pattern: /^6(?:011|5)/,
    logo: 'DISC',
    bankName: 'Discover',
    backgroundStyle: 'bg-gradient-to-r from-orange-500 to-orange-700',
    lengths: [16],
    cvvLength: 3,
    color: 'from-orange-500 to-orange-400'
  },
  jcb: {
    pattern: /^35(?:2[89]|[3-8][0-9])/,
    logo: 'JCB',
    bankName: 'JCB',
    backgroundStyle: 'bg-gradient-to-r from-green-600 to-green-800',
    lengths: [16],
    cvvLength: 3,
    color: 'from-green-600 to-green-800'
  },
  diners: {
    pattern: /^3(?:0[0-5]|[68][0-9])[0-9]/,
    logo: 'DINC',
    bankName: 'Diners Club',
    backgroundStyle: 'bg-gradient-to-r from-blue-400 to-blue-600',
    lengths: [14, 16],
    cvvLength: 3,
    color: 'from-blue-400 to-blue-600'
  },
  unionpay: {
    pattern: /^(62|88)/,
    logo: 'UP',
    bankName: 'UnionPay',
    backgroundStyle: 'bg-gradient-to-r from-red-700 to-red-900',
    lengths: [16, 17, 18, 19],
    cvvLength: 3,
    color: 'from-red-700 to-red-900'
  },
  maestro: {
    pattern: /^(5018|5020|5038|6304|6759|6761|6763)/,
    logo: 'MAES',
    bankName: 'Maestro',
    backgroundStyle: 'bg-gradient-to-r from-blue-500 to-blue-700',
    lengths: [13, 15, 16, 18, 19],
    cvvLength: 3,
    color: 'from-blue-500 to-blue-700'
  },
  // Add more specific banks based on BIN ranges
  chase: {
    pattern: /^4147[0-9]{6}/,
    logo: 'CHASE',
    bankName: 'Chase Bank',
    backgroundStyle: 'bg-gradient-to-r from-blue-900 to-blue-950',
    lengths: [16],
    cvvLength: 3,
    color: 'from-blue-800 to-blue-950'
  },
  citibank: {
    pattern: /^(4128|4502|4527|8123)/,
    logo: 'CITI',
    bankName: 'Citibank',
    backgroundStyle: 'bg-gradient-to-r from-blue-600 to-indigo-800',
    lengths: [16],
    cvvLength: 3,
    color: 'from-blue-600 to-indigo-800'
  },
  bofa: {
    pattern: /^4(1|0|8)[0-9]{2}(1|0|8)[0-9]{10}$/,
    logo: 'BOFA',
    bankName: 'Bank of America',
    backgroundStyle: 'bg-gradient-to-r from-red-700 to-red-950',
    lengths: [16],
    cvvLength: 3,
    color: 'from-red-700 to-red-950'
  },
  wells: {
    pattern: /^4465[0-9]{2}|^4465[0-9]{2}/,
    logo: 'WF',
    bankName: 'Wells Fargo',
    backgroundStyle: 'bg-gradient-to-r from-red-600 to-red-800',
    lengths: [16],
    cvvLength: 3,
    color: 'from-red-600 to-red-800'
  },
  amex_gold: {
    pattern: /^3712/,
    logo: 'AMEXG',
    bankName: 'Amex Gold',
    backgroundStyle: 'bg-gradient-to-r from-yellow-600 to-yellow-800',
    lengths: [15],
    cvvLength: 4,
    color: 'from-yellow-600 to-yellow-800'
  },
  amex_platinum: {
    pattern: /^3782/,
    logo: 'AMEXP',
    bankName: 'Amex Platinum',
    backgroundStyle: 'bg-gradient-to-r from-slate-400 to-slate-600',
    lengths: [15],
    cvvLength: 4,
    color: 'from-slate-400 to-slate-600'
  },
  unknown: {
    pattern: /.*/, // Match anything
    logo: '?',
    bankName: 'Unknown',
    backgroundStyle: 'bg-gradient-to-r from-slate-800 to-slate-900',
    lengths: [16, 17, 18, 19],
    cvvLength: 3,
    color: 'from-slate-800 to-slate-900'
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
  errors: ValidationErrors;
} => {
  const errors: ValidationErrors = {};
  
  let isValid = true;
  const digits = cardState.number.replace(/\D/g, '');
  
  // Validate card number
  if (!digits) {
    errors.number = 'Card number is required';
    errors.cardNumber = 'Card number is required'; // For backward compatibility
    isValid = false;
  } else if (!luhnCheck(digits)) {
    errors.number = 'Invalid card number';
    errors.cardNumber = 'Invalid card number'; // For backward compatibility
    isValid = false;
  }
  
  // Validate card type and length
  const cardType = cardState.cardType;
  if (cardType && cardTypes[cardType] && digits) {
    if (!cardTypes[cardType].lengths.includes(digits.length)) {
      const message = `${cardTypes[cardType].logo} card should have ${cardTypes[cardType].lengths.join(' or ')} digits`;
      errors.number = message;
      errors.cardNumber = message; // For backward compatibility
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
  
  // Validate card holder name
  if (!cardState.holder) {
    errors.holder = 'Card holder name is required';
    isValid = false;
  } else if (cardState.holder.length < 3) {
    errors.holder = 'Card holder name is too short';
    isValid = false;
  }
  
  // Validate extended fields if provided
  if (cardState.address === '') {
    errors.address = 'Address is required';
    isValid = false;
  }
  
  if (cardState.city === '') {
    errors.city = 'City is required';
    isValid = false;
  }
  
  if (cardState.state === '') {
    errors.state = 'State/Province is required';
    isValid = false;
  }
  
  if (cardState.zip === '') {
    errors.zip = 'ZIP/Postal code is required';
    isValid = false;
  } else if (cardState.zip && !/^\d{5}(-\d{4})?$/.test(cardState.zip)) {
    errors.zip = 'Invalid ZIP/Postal code format';
    isValid = false;
  }
  
  if (cardState.country === '') {
    errors.country = 'Country is required';
    isValid = false;
  }
  
  // Validate phone if provided
  if (cardState.phone === '') {
    errors.phone = 'Phone number is required';
    isValid = false;
  } else if (cardState.phone && !/^\+?[0-9\s\-()]{10,15}$/.test(cardState.phone)) {
    errors.phone = 'Invalid phone number format';
    isValid = false;
  }
  
  // Validate email if provided
  if (cardState.email === '') {
    errors.email = 'Email is required';
    isValid = false;
  } else if (cardState.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cardState.email)) {
    errors.email = 'Invalid email format';
    isValid = false;
  }
  
  return { isValid, errors };
};
