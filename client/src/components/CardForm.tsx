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
  setValidationResult: (result: { isValid: boolean; message: string; } | null) => void;
}

export default function CardForm({ 
  cardState, 
  updateCardState, 
  setValidationResult 
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationResult = validateCard(cardState);
    setErrors(validationResult.errors);
    
    if (validationResult.isValid) {
      const cardTypeName = cardState.cardType ? cardTypes[cardState.cardType].logo : '';
      setValidationResult({
        isValid: true,
        message: `Card is valid! This ${cardTypeName} card passes the Luhn check.`
      });
    } else {
      setValidationResult({
        isValid: false,
        message: "Card validation failed. Please check the errors above."
      });
    }
  };

  return (
    <form className="px-6 py-4" onSubmit={handleSubmit}>
      {/* Card Number */}
      <div className="mb-4">
        <label htmlFor="card-number" className="block text-gray-700 text-sm font-medium mb-1">
          Card Number
        </label>
        <div className="relative">
          <input 
            type="text" 
            id="card-number" 
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
            placeholder="1234 5678 9012 3456" 
            maxLength={19} 
            value={cardState.number}
            onChange={handleCardNumberChange}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {cardState.cardType && cardTypes[cardState.cardType]?.logo}
          </div>
        </div>
        {errors.cardNumber && (
          <p className="text-destructive text-xs mt-1">{errors.cardNumber}</p>
        )}
      </div>

      {/* Card Holder */}
      <div className="mb-4">
        <label htmlFor="card-holder" className="block text-gray-700 text-sm font-medium mb-1">
          Card Holder Name
        </label>
        <input 
          type="text" 
          id="card-holder" 
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
          placeholder="Full Name on Card"
          value={cardState.holder}
          onChange={(e) => updateCardState({ holder: e.target.value })}
        />
      </div>

      {/* Expiry Date and CVV */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="expiry-date" className="block text-gray-700 text-sm font-medium mb-1">
            Expiry Date
          </label>
          <input 
            type="text" 
            id="expiry-date" 
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
            placeholder="MM/YY" 
            maxLength={5}
            value={cardState.expiry}
            onChange={handleExpiryChange}
          />
          {errors.expiry && (
            <p className="text-destructive text-xs mt-1">{errors.expiry}</p>
          )}
        </div>
        <div>
          <label htmlFor="cvv" className="block text-gray-700 text-sm font-medium mb-1">
            CVV
          </label>
          <input 
            type="text" 
            id="cvv" 
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" 
            placeholder="123" 
            maxLength={4}
            value={cardState.cvv}
            onChange={handleCvvChange}
          />
          {errors.cvv && (
            <p className="text-destructive text-xs mt-1">{errors.cvv}</p>
          )}
        </div>
      </div>

      <button 
        type="submit" 
        className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md transition-colors font-medium"
      >
        Validate Card
      </button>
    </form>
  );
}
