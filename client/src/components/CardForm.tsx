import { useState } from "react";
import { CardState } from "@/types/card";
import { 
  formatCardNumber, 
  formatExpiry, 
  identifyCardType, 
  cardTypes, 
  validateCard 
} from "@/utils/cardValidation";

interface CardFormProps {
  cardState: CardState;
  updateCardState: (updates: Partial<CardState>) => void;
  setValidationResult: (result: { isValid: boolean; message: string; details?: any } | null) => void;
  onValidate?: () => Promise<void>;
  isLoading?: boolean;
}

export default function CardForm({ 
  cardState, 
  updateCardState, 
  setValidationResult,
  onValidate,
  isLoading = false
}: CardFormProps) {
  const [errors, setErrors] = useState<{
    cardNumber?: string;
    expiry?: string;
    cvv?: string;
  }>({});

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    e.target.value = formatted;
    
    // Identify card type
    const cardType = identifyCardType(formatted);
    
    updateCardState({ 
      number: formatted,
      cardType
    });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    e.target.value = formatted;
    updateCardState({ expiry: formatted });
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cvv = e.target.value.replace(/\D/g, '');
    e.target.value = cvv;
    updateCardState({ cvv });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First do local validation
    const localValidation = validateCard(cardState);
    setErrors(localValidation.errors);
    
    if (!localValidation.isValid) {
      setValidationResult({
        isValid: false,
        message: "Card validation failed. Please check the errors above."
      });
      return;
    }
    
    // If local validation passes, proceed with API validation
    if (onValidate) {
      await onValidate();
    } else {
      // Fallback to local validation result if no API validation
      const cardTypeName = cardState.cardType ? cardTypes[cardState.cardType].logo : '';
      setValidationResult({
        isValid: true,
        message: `Card is valid! This ${cardTypeName} card passes the Luhn check.`
      });
    }
  };

  return (
    <form className="px-6 py-4" onSubmit={handleSubmit}>
      {/* Card Number */}
      <div className="mb-4">
        <label htmlFor="card-number" className="block text-zinc-300 text-sm font-medium mb-1">
          Card Number
        </label>
        <div className="relative">
          <input 
            type="text" 
            id="card-number" 
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white" 
            placeholder="1234 5678 9012 3456" 
            maxLength={19} 
            value={cardState.number}
            onChange={handleCardNumberChange}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400">
            {cardState.cardType && cardTypes[cardState.cardType]?.logo}
          </div>
        </div>
        {errors.cardNumber && (
          <p className="text-red-400 text-xs mt-1">{errors.cardNumber}</p>
        )}
      </div>

      {/* Card Holder */}
      <div className="mb-4">
        <label htmlFor="card-holder" className="block text-zinc-300 text-sm font-medium mb-1">
          Card Holder Name
        </label>
        <input 
          type="text" 
          id="card-holder" 
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white" 
          placeholder="Full Name on Card"
          value={cardState.holder}
          onChange={(e) => updateCardState({ holder: e.target.value })}
        />
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="expiry-date" className="block text-zinc-300 text-sm font-medium mb-1">
            Expiry Date
          </label>
          <input 
            type="text" 
            id="expiry-date" 
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white" 
            placeholder="MM/YY" 
            maxLength={5}
            value={cardState.expiry}
            onChange={handleExpiryChange}
          />
          {errors.expiry && (
            <p className="text-red-400 text-xs mt-1">{errors.expiry}</p>
          )}
        </div>
        <div>
          <label htmlFor="cvv" className="block text-zinc-300 text-sm font-medium mb-1">
            CVV
          </label>
          <input 
            type="text" 
            id="cvv" 
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all text-white" 
            placeholder="123" 
            maxLength={4}
            value={cardState.cvv}
            onChange={handleCvvChange}
          />
          {errors.cvv && (
            <p className="text-red-400 text-xs mt-1">{errors.cvv}</p>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 text-white py-3 px-4 rounded-md transition-colors font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Validating...
          </span>
        ) : (
          'Check Card'
        )}
      </button>
    </form>
  );
}
