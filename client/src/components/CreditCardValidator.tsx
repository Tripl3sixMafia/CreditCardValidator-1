import { useState } from "react";
import CardDisplay from "./CardDisplay";
import CardForm from "./CardForm";
import { CardState } from "@/types/card";
import Logo from "./Logo";
import { apiRequest } from "@/lib/queryClient";
import { validateCard } from "@/utils/cardValidation";

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
    code?: string;
    details?: {
      brand?: string;
      last4?: string;
      funding?: string;
      country?: string;
    };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState<string>("stripe");
  
  // Local validation for separate fields
  const cardValidation = validateCard(cardState);

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
        cvv: cardState.cvv,
        processor: selectedProcessor
      });
      
      const data = await response.json();
      
      if (data.success) {
        setValidationResult({
          isValid: true,
          message: data.message || "Card is valid and active",
          details: data.details,
          code: data.code
        });
      } else {
        setValidationResult({
          isValid: false,
          message: data.message || "Card validation failed",
          code: data.code
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

  // Component for displaying individual field validation status
  const StatusIndicator = ({ 
    status, 
    label, 
    message 
  }: { 
    status: boolean | null; 
    label: string;
    message?: string;
  }) => {
    const bgColor = status === null 
      ? 'bg-zinc-800/50' 
      : status 
        ? 'bg-green-900/20 border-green-800' 
        : 'bg-red-900/20 border-red-800';
    
    const textColor = status === null 
      ? 'text-zinc-400' 
      : status 
        ? 'text-green-400'
        : 'text-red-400';

    const iconColor = status === null 
      ? 'text-zinc-600' 
      : status 
        ? 'text-green-500' 
        : 'text-red-500';

    return (
      <div className={`p-2.5 rounded-lg border ${bgColor} flex items-center`}>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${iconColor}`}>
          {status === null ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : status ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className={`text-xs font-medium ${textColor}`}>{label}</p>
          {message && <p className="text-xs text-zinc-500 mt-0.5">{message}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-800">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-amber-900/60 to-zinc-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-semibold">Card Validator</h1>
            <p className="text-amber-200 text-sm">Tripl3sixMafia Verification System</p>
          </div>
          <Logo className="w-12 h-12" />
        </div>

        {/* Card Display */}
        <CardDisplay cardState={cardState} />
        
        {/* Processor Selection */}
        <div className="mx-6 mt-4 mb-3">
          <p className="text-xs text-zinc-400 mb-2 font-medium">SELECT PROCESSOR</p>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setSelectedProcessor('stripe')}
              className={`py-2 px-3 text-xs rounded-md border ${
                selectedProcessor === 'stripe' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              STRIPE
            </button>
            <button 
              onClick={() => setSelectedProcessor('paypal')}
              className={`py-2 px-3 text-xs rounded-md border ${
                selectedProcessor === 'paypal' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              } opacity-50`}
              disabled
            >
              PAYPAL (Coming Soon)
            </button>
          </div>
        </div>

        {/* Individual Field Validation Status */}
        <div className="mx-6 mb-4 grid grid-cols-1 gap-2">
          <StatusIndicator 
            status={cardState.number ? !cardValidation.errors.cardNumber : null} 
            label="CARD NUMBER"
            message={cardValidation.errors.cardNumber}
          />
          <StatusIndicator 
            status={cardState.expiry ? !cardValidation.errors.expiry : null} 
            label="EXPIRY DATE"
            message={cardValidation.errors.expiry}
          />
          <StatusIndicator 
            status={cardState.cvv ? !cardValidation.errors.cvv : null} 
            label="CVV/CVC"
            message={cardValidation.errors.cvv}
          />
        </div>

        {/* Processor Validation Results */}
        {validationResult && (
          <div className={`mx-6 mb-4 p-4 rounded-lg border ${
            validationResult.isValid 
              ? 'bg-green-900/20 border-green-800' 
              : 'bg-red-900/20 border-red-800'
          }`}>
            <div className="flex items-start">
              <div className={`w-8 h-8 mt-0.5 shrink-0 rounded-full flex items-center justify-center ${
                validationResult.isValid ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {validationResult.isValid ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <div className="flex items-center">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                    validationResult.isValid ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                  }`}>
                    {selectedProcessor}
                  </span>
                  {validationResult.code && (
                    <span className="ml-2 text-xs text-zinc-500">Code: {validationResult.code}</span>
                  )}
                </div>
                <p className={`text-sm font-medium mt-1 ${
                  validationResult.isValid ? 'text-green-400' : 'text-red-400'
                }`}>
                  {validationResult.message}
                </p>
              </div>
            </div>
            
            {validationResult.isValid && validationResult.details && (
              <div className="mt-3 pl-11 text-xs text-zinc-400 grid grid-cols-2 gap-2">
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
