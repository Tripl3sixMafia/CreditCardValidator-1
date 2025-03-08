import { useState } from "react";
import CardDisplay from "./CardDisplay";
import CardForm from "./CardForm";
import { CardState } from "@/types/card";

export default function CreditCardValidator() {
  const [cardState, setCardState] = useState<CardState>({
    number: "",
    holder: "",
    expiry: "",
    cvv: "",
    isValid: null,
    cardType: null,
  });

  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const updateCardState = (updates: Partial<CardState>) => {
    setCardState((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header Section */}
        <div className="bg-primary px-6 py-4">
          <h1 className="text-white text-xl font-semibold">Credit Card Validator</h1>
          <p className="text-blue-100 text-sm">Verify your card with real-time validation</p>
        </div>

        {/* Card Display */}
        <CardDisplay cardState={cardState} />

        {/* Validation Status */}
        {validationResult && (
          <div 
            className={`mx-6 mt-4 p-3 rounded-md text-center text-sm font-medium
              ${validationResult.isValid 
                ? 'bg-success/10 text-success' 
                : 'bg-destructive/10 text-destructive'}`
            }
          >
            <div className="flex items-center justify-center">
              {validationResult.isValid ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {validationResult.message}
            </div>
          </div>
        )}

        {/* Form Section */}
        <CardForm 
          cardState={cardState} 
          updateCardState={updateCardState} 
          setValidationResult={setValidationResult} 
        />

        {/* Info Section */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <p className="text-xs text-gray-500">
            This validator uses the Luhn algorithm to check if your card number is valid. No data is stored or transmitted.
          </p>
        </div>
      </div>
    </div>
  );
}
