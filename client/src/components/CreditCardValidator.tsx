import { useState } from "react";
import CardDisplay from "./CardDisplay";
import CardForm from "./CardForm";
import { CardState } from "@/types/card";
import Logo from "./Logo";
import { apiRequest } from "@/lib/queryClient";

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
    details?: {
      brand?: string;
      last4?: string;
      funding?: string;
      country?: string;
    };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const updateCardState = (updates: Partial<CardState>) => {
    setCardState((prev) => ({ ...prev, ...updates }));
  };
  
  const handleValidateCard = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/validate-card", {
        number: cardState.number,
        holder: cardState.holder,
        expiry: cardState.expiry,
        cvv: cardState.cvv
      });
      
      const data = await response.json();
      
      if (data.success) {
        setValidationResult({
          isValid: true,
          message: data.message || "Card is valid and active",
          details: data.details
        });
      } else {
        setValidationResult({
          isValid: false,
          message: data.message || "Card validation failed"
        });
      }
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: "Error validating card. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-800">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-red-900 to-red-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-semibold">Card Validator</h1>
            <p className="text-red-100 text-sm">Verify your card's active status</p>
          </div>
          <Logo className="w-12 h-12" />
        </div>

        {/* Card Display */}
        <CardDisplay cardState={cardState} />

        {/* Validation Status */}
        {validationResult && (
          <div 
            className={`mx-6 mt-4 p-3 rounded-md text-center text-sm font-medium
              ${validationResult.isValid 
                ? 'bg-green-900/20 text-green-400 border border-green-800' 
                : 'bg-red-900/20 text-red-400 border border-red-800'}`
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
            
            {validationResult.isValid && validationResult.details && (
              <div className="text-xs space-y-1 mt-2 text-left pl-8">
                {validationResult.details.brand && (
                  <p>Brand: <span className="text-white">{validationResult.details.brand}</span></p>
                )}
                {validationResult.details.last4 && (
                  <p>Last digits: <span className="text-white">{validationResult.details.last4}</span></p>
                )}
                {validationResult.details.funding && (
                  <p>Type: <span className="text-white">{validationResult.details.funding}</span></p>
                )}
                {validationResult.details.country && (
                  <p>Country: <span className="text-white">{validationResult.details.country}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form Section */}
        <CardForm 
          cardState={cardState} 
          updateCardState={updateCardState} 
          setValidationResult={setValidationResult}
          onValidate={handleValidateCard}
          isLoading={isLoading}
        />

        {/* Info Section */}
        <div className="border-t border-zinc-800 px-6 py-4 bg-zinc-950">
          <p className="text-xs text-zinc-500">
            Tripl3sixMafia CC validates your card for online purchases. All testing is secure and uses industry-standard encryption.
          </p>
        </div>
      </div>
    </div>
  );
}
