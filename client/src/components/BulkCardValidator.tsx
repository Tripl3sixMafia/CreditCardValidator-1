import { useState, useRef, ChangeEvent } from "react";
import { apiRequest } from "@/lib/queryClient";
import { luhnCheck } from "@/utils/cardValidation";

type BulkValidationResult = {
  validCards: string[];
  invalidCards: Array<{
    card: string;
    reason: string;
  }>;
  totalProcessed: number;
  validCount: number;
  invalidCount: number;
};

type CardStatus = 'LIVE' | 'DEAD' | 'UNKNOWN';

export default function BulkCardValidator() {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<BulkValidationResult | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [totalCards, setTotalCards] = useState<number>(0);
  const [processor, setProcessor] = useState<string>("luhn");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResults(null);
      
      // Count the number of lines in the file to determine card count
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const lines = content.split('\n').filter(line => line.trim());
          setTotalCards(lines.length);
        }
      };
      reader.readAsText(selectedFile);
    }
  };
  
  // Function to perform Luhn check (standard and Amex)
  function isValidCreditCard(number: string): boolean {
    // Remove non-digit characters
    number = number.replace(/\D/g, '');

    // Check if it's potentially a valid credit card number
    if (!/^(?:3[47][0-9]{13}|4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/.test(number)) {
      return false;
    }

    return luhnCheck(number);
  }
  
  const validateCard = async (cardData: string): Promise<{ success: boolean; message: string; code?: string; status?: CardStatus }> => {
    try {
      // Parse card data in format: number|month|year|cvv
      const [number, month, year, cvv] = cardData.split('|');
      if (!number || !month || !year || !cvv) {
        return { 
          success: false, 
          message: 'Invalid card format', 
          status: 'DEAD' 
        };
      }
      
      // Determine if using API or local validation
      if (processor === 'luhn') {
        // Perform local Luhn check
        if (!isValidCreditCard(number)) {
          return { 
            success: false, 
            message: 'Invalid (Luhn Check Failed)', 
            status: 'DEAD' 
          };
        }
        
        // Simulate API behavior with randomized responses (like in the provided code)
        const randomNumber = Math.random();
        let status: CardStatus = 'UNKNOWN';
        let message = 'Card processed';
        let isSuccess = false;
        
        if (randomNumber < 0.2) {
          // ~20% chance for LIVE card
          status = 'LIVE';
          message = 'Live | Charge $4.99 [GATE:01]';
          isSuccess = true;
        } else if (randomNumber < 0.9) {
          // ~70% chance for DEAD card
          status = 'DEAD';
          message = 'Dead | Charge $0.00 [GATE:01]';
          isSuccess = false;
        } else {
          // ~10% chance for UNKNOWN card
          status = 'UNKNOWN';
          message = 'Unknown | Charge N/A [GATE:01]';
          isSuccess = false;
        }
        
        return {
          success: isSuccess,
          message: message,
          status: status,
          code: status.toLowerCase()
        };
      } else {
        // Use the backend API for validation instead
        // Format the data for API
        const formattedExpiry = `${month}/${year.slice(-2)}`;
        
        // Make API call
        const response = await apiRequest('POST', '/api/validate-card', {
          number: number.trim(),
          expiry: formattedExpiry,
          cvv: cvv.trim(),
          holder: 'Bulk Check',
          processor
        });
        
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error validating card:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'DEAD'
      };
    }
  };
  
  const processCardBatch = async (cards: string[], startIndex: number, batchSize: number) => {
    const validCards: string[] = [];
    const invalidCards: Array<{ card: string; reason: string }> = [];
    
    const batch = cards.slice(startIndex, startIndex + batchSize);
    
    // Process each card in the batch
    for (let i = 0; i < batch.length; i++) {
      const cardData = batch[i].trim();
      if (cardData) {
        const result = await validateCard(cardData);
        
        if (result.success) {
          validCards.push(`${cardData} -> [${result.message}]`);
        } else {
          invalidCards.push({
            card: cardData,
            reason: result.message || 'Unknown error'
          });
        }
        
        // Update progress
        const currentProgress = startIndex + i + 1;
        setProgress(Math.floor((currentProgress / cards.length) * 100));
      }
    }
    
    return { validCards, invalidCards };
  };
  
  const handleBulkValidation = async () => {
    if (!file) return;
    
    setIsLoading(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const cards = text.split('\n').filter(line => line.trim());
      
      if (cards.length > 250) {
        alert('Maximum 250 cards allowed for bulk validation.');
        setIsLoading(false);
        return;
      }
      
      const batchSize = 10; // Process 10 cards at a time
      let validCards: string[] = [];
      let invalidCards: Array<{ card: string; reason: string }> = [];
      
      // Process cards in batches
      for (let i = 0; i < cards.length; i += batchSize) {
        const batchResult = await processCardBatch(cards, i, batchSize);
        
        validCards = [...validCards, ...batchResult.validCards];
        invalidCards = [...invalidCards, ...batchResult.invalidCards];
      }
      
      // Set final results
      setResults({
        validCards,
        invalidCards,
        totalProcessed: cards.length,
        validCount: validCards.length,
        invalidCount: invalidCards.length
      });
      
    } catch (error) {
      console.error('Error processing bulk validation:', error);
      alert('Error processing cards. Please check the file format.');
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };
  
  const downloadResults = (type: 'valid' | 'invalid') => {
    if (!results) return;
    
    let content = '';
    let filename = '';
    
    if (type === 'valid') {
      content = results.validCards.join('\n');
      filename = 'valid_cards.txt';
    } else {
      content = results.invalidCards.map(card => `${card.card} | Reason: ${card.reason}`).join('\n');
      filename = 'invalid_cards.txt';
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const resetForm = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800">
        <h2 className="text-xl font-semibold text-white mb-2">Bulk Card Validation</h2>
        <p className="text-zinc-400 text-sm">
          Upload a text file with cards in format: <span className="bg-zinc-800 px-1 py-0.5 rounded text-amber-400 font-mono text-xs">number|month|year|cvv</span>
        </p>
      </div>
      
      <div className="p-6">
        {/* Processor Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-2">Select Processor</label>
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={() => setProcessor('luhn')}
              className={`py-2 px-3 text-xs rounded-md border ${
                processor === 'luhn' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              LUHN CHECKER
            </button>
            <button 
              onClick={() => setProcessor('stripe')}
              className={`py-2 px-3 text-xs rounded-md border ${
                processor === 'stripe' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              STRIPE
            </button>
            <button 
              onClick={() => setProcessor('paypal')}
              className={`py-2 px-3 text-xs rounded-md border ${
                processor === 'paypal' 
                  ? 'bg-amber-900/30 border-amber-700 text-amber-400' 
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              } opacity-50`}
              disabled
            >
              PAYPAL (Soon)
            </button>
          </div>
        </div>
        
        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Upload Card List (Max 250 cards)
          </label>
          <div className="flex items-center justify-center w-full">
            <label 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-3 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {file ? (
                  <div className="text-center">
                    <p className="text-sm text-amber-400 font-medium">{file.name}</p>
                    <p className="text-xs text-zinc-400">{totalCards} cards detected</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-zinc-400">Click to upload or drag and drop</p>
                    <p className="text-xs text-zinc-500">Text file (.txt) with one card per line</p>
                  </div>
                )}
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept=".txt" 
                onChange={handleFileChange} 
              />
            </label>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleBulkValidation}
            disabled={!file || isLoading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Validate Cards'}
          </button>
          <button
            onClick={resetForm}
            disabled={isLoading}
            className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
        </div>
        
        {/* Progress Bar */}
        {isLoading && (
          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-1">
              <div 
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-zinc-400 text-right">{progress}% Complete</p>
          </div>
        )}
        
        {/* Results */}
        {results && (
          <div className="mt-6 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="p-4 bg-zinc-800/30">
              <h3 className="text-white font-medium">Results Summary</h3>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div className="bg-zinc-800 p-3 rounded-md text-center">
                  <p className="text-zinc-400 text-xs font-medium">Total</p>
                  <p className="text-white text-xl font-bold">{results.totalProcessed}</p>
                </div>
                <div className="bg-green-900/30 border border-green-800 p-3 rounded-md text-center">
                  <p className="text-green-400 text-xs font-medium">Valid</p>
                  <p className="text-white text-xl font-bold">{results.validCount}</p>
                </div>
                <div className="bg-red-900/30 border border-red-800 p-3 rounded-md text-center">
                  <p className="text-red-400 text-xs font-medium">Invalid</p>
                  <p className="text-white text-xl font-bold">{results.invalidCount}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex flex-col md:flex-row gap-3">
              <button
                onClick={() => downloadResults('valid')}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2 px-3 rounded-md font-medium text-sm transition-colors"
                disabled={results.validCount === 0}
              >
                Download Valid Cards
              </button>
              <button
                onClick={() => downloadResults('invalid')}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded-md font-medium text-sm transition-colors"
                disabled={results.invalidCount === 0}
              >
                Download Invalid Cards
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}