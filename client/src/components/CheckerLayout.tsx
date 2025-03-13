import { useState, useRef, ChangeEvent } from "react";
import { apiRequest } from "@/lib/queryClient";
import { BinData } from "./BinDisplay";

type CardResult = {
  card: string;
  message: string;
  code?: string;
  status?: string; // LIVE, DEAD, or UNKNOWN status
  details?: {
    brand?: string;
    last4?: string;
    funding?: string;
    country?: string;
  };
  binData?: BinData | null;
};

type CheckerResults = {
  liveCards: CardResult[];
  deadCards: CardResult[];
  unknownCards: CardResult[];
  processed: number;
  total: number;
};

export default function CheckerLayout() {
  const [input, setInput] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [results, setResults] = useState<CheckerResults>({
    liveCards: [],
    deadCards: [],
    unknownCards: [],
    processed: 0,
    total: 0
  });
  const [progress, setProgress] = useState<number>(0);
  const [processor, setProcessor] = useState<string>("chker");
  const [stripeKey, setStripeKey] = useState<string>("");
  const [showStripeKey, setShowStripeKey] = useState<boolean>(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  
  const parseCardLine = (line: string): { number: string, month: string, year: string, cvv: string, holder?: string, address?: string, city?: string, state?: string, zip?: string, country?: string, phone?: string, email?: string } | null => {
    line = line.trim();
    if (!line) return null;
    
    // Try to parse in full format: number|expiry|cvv|name|address|city|state|zip|country|phone|email
    const pipeFormat = line.split('|');
    
    // Handle full payment details format
    if (pipeFormat.length > 4) {
      // Extract expiry from MM/YY format
      const expiry = pipeFormat[1].split('/');
      if (expiry.length !== 2) return null;
      
      return {
        number: pipeFormat[0].trim(),
        month: expiry[0].trim(),
        year: expiry[1].trim(),
        cvv: pipeFormat[2].trim(),
        holder: pipeFormat[3]?.trim(),
        address: pipeFormat[4]?.trim(),
        city: pipeFormat[5]?.trim(),
        state: pipeFormat[6]?.trim(),
        zip: pipeFormat[7]?.trim(),
        country: pipeFormat[8]?.trim(),
        phone: pipeFormat[9]?.trim(),
        email: pipeFormat[10]?.trim()
      };
    }
    
    // Handle basic format: number|month|year|cvv
    if (pipeFormat.length === 4) {
      return {
        number: pipeFormat[0].trim(),
        month: pipeFormat[1].trim(),
        year: pipeFormat[2].trim(),
        cvv: pipeFormat[3].trim()
      };
    }
    
    // Try to parse in format number month/year cvv
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      const number = parts[0];
      const expiry = parts[1].split('/');
      const cvv = parts[parts.length - 1];
      
      if (expiry.length === 2) {
        return {
          number,
          month: expiry[0],
          year: expiry[1],
          cvv
        };
      }
    }
    
    return null;
  };
  
  const checkCard = async (cardData: { 
    number: string, 
    month: string, 
    year: string, 
    cvv: string,
    holder?: string,
    address?: string,
    city?: string,
    state?: string,
    zip?: string,
    country?: string,
    phone?: string,
    email?: string
  }): Promise<CardResult> => {
    try {
      const { number, month, year, cvv, holder, address, city, state, zip, country, phone, email } = cardData;
      const formattedExpiry = `${month}/${year.length === 2 ? year : year.slice(-2)}`;
      
      // Prepare request data based on selected processor
      const requestData: any = {
        number,
        expiry: formattedExpiry,
        cvv,
        holder: holder || 'Card Check',
        processor: processor === 'stripe-custom' ? 'stripe' : processor
      };
      
      // Add additional customer details if available
      if (address) requestData.address = address;
      if (city) requestData.city = city;
      if (state) requestData.state = state;
      if (zip) requestData.zip = zip;
      if (country) requestData.country = country;
      if (phone) requestData.phone = phone;
      if (email) requestData.email = email;
      
      // Add stripe key if it's provided and the processor is stripe-custom
      if (processor === 'stripe-custom' && stripeKey.trim()) {
        requestData.stripeKey = stripeKey.trim();
      }
      
      const response = await apiRequest('POST', '/api/validate-card', requestData);
      
      const data = await response.json();
      
      // Format the card string to include all details for display
      let cardString = `${number}|${month}|${year}|${cvv}`;
      if (holder) cardString += `|${holder}`;
      
      // Ensure we always get a status from the server or use a default
      return {
        card: cardString,
        message: data.message,
        code: data.code,
        status: data.status || (data.success ? 'LIVE' : 'DEAD'), // Ensure status is always present
        details: data.details,
        binData: data.binData
      };
    } catch (error) {
      return {
        card: `${cardData.number}|${cardData.month}|${cardData.year}|${cardData.cvv}`,
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'UNKNOWN' // Default to UNKNOWN for error cases
      };
    }
  };
  
  const checkCards = async () => {
    if (!input.trim()) return;
    
    setIsChecking(true);
    setProgress(0);
    
    const lines = input.split('\n').filter(line => line.trim());
    
    if (lines.length > 500) {
      alert('Maximum 500 cards allowed for checking.');
      setIsChecking(false);
      return;
    }
    
    const newResults: CheckerResults = {
      liveCards: [],
      deadCards: [],
      unknownCards: [],
      processed: 0,
      total: lines.length
    };
    
    setResults(newResults);
    
    for (let i = 0; i < lines.length; i++) {
      const cardData = parseCardLine(lines[i]);
      
      if (cardData) {
        try {
          const result = await checkCard(cardData);
          
          // Check the status to determine card classification
          if (result.status === 'LIVE') {
            newResults.liveCards.push(result);
          } else if (result.status === 'DEAD') {
            newResults.deadCards.push(result);
          } else {
            // Unknown cards are ones with validation errors or unknown status
            newResults.unknownCards.push(result);
          }
        } catch (error) {
          newResults.unknownCards.push({
            card: lines[i],
            message: error instanceof Error ? error.message : 'Unknown error',
            status: 'UNKNOWN'
          });
        }
      } else {
        newResults.unknownCards.push({
          card: lines[i],
          message: 'Invalid card format',
          status: 'UNKNOWN'
        });
      }
      
      newResults.processed = i + 1;
      setProgress(Math.floor(((i + 1) / lines.length) * 100));
      setResults({...newResults});
    }
    
    setIsChecking(false);
  };
  
  const downloadCards = (type: 'live' | 'dead' | 'unknown') => {
    let content = '';
    let filename = '';
    
    if (type === 'live') {
      content = results.liveCards.map(card => `${card.card} | Message: ${card.message}`).join('\n');
      filename = 'live_cards.txt';
    } else if (type === 'dead') {
      content = results.deadCards.map(card => `${card.card} | Message: ${card.message}`).join('\n');
      filename = 'dead_cards.txt';
    } else {
      content = results.unknownCards.map(card => `${card.card} | Message: ${card.message}`).join('\n');
      filename = 'unknown_cards.txt';
    }
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = (type: 'live' | 'dead' | 'unknown') => {
    let content = '';
    
    if (type === 'live') {
      content = results.liveCards.map(card => card.card).join('\n');
    } else if (type === 'dead') {
      content = results.deadCards.map(card => card.card).join('\n');
    } else {
      content = results.unknownCards.map(card => card.card).join('\n');
    }
    
    navigator.clipboard.writeText(content);
  };
  
  const clearAll = () => {
    setInput('');
    setResults({
      liveCards: [],
      deadCards: [],
      unknownCards: [],
      processed: 0,
      total: 0
    });
    setProgress(0);
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };
  
  const CardList = ({ cards, type }: { cards: CardResult[], type: 'live' | 'dead' | 'unknown' }) => {
    const bgColor = type === 'live' 
      ? 'bg-green-900/20 border-green-800' 
      : type === 'dead' 
        ? 'bg-red-900/20 border-red-800' 
        : 'bg-zinc-800 border-zinc-700';
        
    const textColor = type === 'live' 
      ? 'text-green-400' 
      : type === 'dead' 
        ? 'text-red-400' 
        : 'text-zinc-400';
        
    const buttonBg = type === 'live' 
      ? 'bg-green-700 hover:bg-green-800' 
      : type === 'dead' 
        ? 'bg-red-700 hover:bg-red-800' 
        : 'bg-zinc-700 hover:bg-zinc-800';
        
    const title = type === 'live' ? 'LIVE' : type === 'dead' ? 'DEAD' : 'UNKNOWN';
    
    return (
      <div className={`border rounded-lg ${bgColor} overflow-hidden`}>
        <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <span className={`font-semibold ${textColor}`}>{title}</span>
            <span className="text-zinc-400 ml-2 text-sm">{cards.length}</span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => copyToClipboard(type)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              disabled={cards.length === 0}
            >
              Copy
            </button>
            <button 
              onClick={() => downloadCards(type)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded"
              disabled={cards.length === 0}
            >
              Download
            </button>
          </div>
        </div>
        <div className="max-h-40 overflow-y-auto p-2">
          {cards.length === 0 ? (
            <div className="text-center text-zinc-500 py-2 text-sm">No cards</div>
          ) : (
            <ul className="text-xs">
              {cards.map((card, index) => (
                <li key={index} className="mb-3 last:mb-0">
                  <div className="font-mono">
                    <span className="text-zinc-400">{card.card.split('|')[0]}</span>
                    <span className="ml-2 text-zinc-500">{card.message}</span>
                  </div>
                  
                  {/* Show BIN data for all cards that have it */}
                  {card.binData && (
                    <div className="mt-1 ml-4 text-[10px] text-zinc-500 border-l-2 border-zinc-800 pl-2">
                      {card.binData.bank?.name && (
                        <div>Bank: <span className="text-amber-400">{card.binData.bank.name}</span></div>
                      )}
                      {card.binData.country?.name && (
                        <div>Country: <span className="text-amber-400">
                          {card.binData.country.emoji} {card.binData.country.name}
                        </span></div>
                      )}
                      {card.binData.scheme && (
                        <div>Scheme: <span className="text-amber-400">{card.binData.scheme}</span></div>
                      )}
                      {card.binData.type && (
                        <div>Type: <span className="text-amber-400">{card.binData.type}</span></div>
                      )}
                      {card.details && (
                        <div>
                          {card.details.brand && (
                            <div>Brand: <span className="text-amber-400">{card.details.brand}</span></div>
                          )}
                          {card.details.funding && (
                            <div>Funding: <span className="text-amber-400">{card.details.funding}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full max-w-4xl grid grid-cols-1 gap-6">
      {/* Header */}
      <div className="bg-zinc-900/80 rounded-lg border border-zinc-800 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-amber-400">Tripl3sixMafia Checker</h1>
            <p className="text-zinc-400 text-sm">Enter your cards below in any of these formats:</p>
            <p className="text-zinc-500 text-xs mt-1">• Basic format: <span className="text-amber-400">number|month|year|cvv</span></p>
            <p className="text-zinc-500 text-xs">• Full format: <span className="text-amber-400">number|MM/YY|cvv|name|address|city|state|zip|country|phone|email</span></p>
          </div>
          
          <div className="flex flex-col space-y-3">
            {/* Processor selection row */}
            <div className="flex items-center space-x-3">
              <div className="text-zinc-400 text-sm flex items-center space-x-2">
                <span>Processor:</span>
                <select 
                  value={processor}
                  onChange={(e) => {
                    setProcessor(e.target.value);
                    if (e.target.value === 'stripe-custom') {
                      setShowStripeKey(true);
                    } else {
                      setShowStripeKey(false);
                    }
                  }}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-amber-400 text-sm"
                >
                  <option value="chker">CHKER.CC API</option>
                  <option value="stripe">Stripe (Default)</option>
                  <option value="stripe-custom">Stripe (Custom Key)</option>
                </select>
              </div>
              
              {/* Show Stripe key input if stripe-custom processor is selected */}
              {showStripeKey && (
                <div className="text-zinc-400 text-sm flex items-center space-x-2">
                  <input
                    type="text"
                    value={stripeKey}
                    onChange={(e) => setStripeKey(e.target.value)}
                    placeholder="Enter Stripe SK Key"
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-amber-400 text-sm w-48"
                  />
                </div>
              )}
            </div>
            
            {/* Action buttons row */}
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAll}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded font-medium transition-colors"
              >
                Clear
              </button>
              <button
                onClick={checkCards}
                disabled={isChecking || !input.trim()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? 'Checking...' : 'Check Cards'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        {isChecking && (
          <div className="mt-4">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1">
              <div 
                className="bg-amber-600 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Processing: {results.processed}/{results.total}</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="bg-zinc-900/80 rounded-lg border border-zinc-800 overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex justify-between">
          <span className="text-zinc-300 font-medium">Input</span>
          <span className="text-zinc-500 text-sm">{input.split('\n').filter(line => line.trim()).length} cards</span>
        </div>
        <textarea 
          ref={textAreaRef}
          value={input}
          onChange={handleInputChange}
          className="w-full bg-zinc-900 text-zinc-300 p-3 h-40 focus:outline-none font-mono text-sm"
          placeholder="Enter cards in format:&#10;4242424242424242|01|2025|123&#10;5555555555554444|11/28|321|John Doe|123 Main St|New York|NY|10001|USA|+1234567890|john@example.com"
        />
      </div>
      
      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardList cards={results.liveCards} type="live" />
        <CardList cards={results.deadCards} type="dead" />
        <CardList cards={results.unknownCards} type="unknown" />
      </div>
      
      {/* Statistics */}
      {results.processed > 0 && (
        <div className="bg-zinc-900/80 rounded-lg border border-zinc-800 p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-zinc-300 font-medium">Statistics</h3>
            <div className="text-xs text-zinc-500">
              Total Processed: {results.processed}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="flex flex-col">
              <div className="flex justify-between">
                <span className="text-green-400 text-sm">Live</span>
                <span className="text-zinc-400 text-sm">{results.liveCards.length}</span>
              </div>
              <div className="mt-1 w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-green-600 h-1.5 rounded-full" 
                  style={{ width: results.processed ? `${(results.liveCards.length / results.processed) * 100}%` : '0%' }}
                ></div>
              </div>
              <div className="mt-1 text-right text-xs text-zinc-500">
                {results.processed ? ((results.liveCards.length / results.processed) * 100).toFixed(1) : 0}%
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex justify-between">
                <span className="text-red-400 text-sm">Dead</span>
                <span className="text-zinc-400 text-sm">{results.deadCards.length}</span>
              </div>
              <div className="mt-1 w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-red-600 h-1.5 rounded-full" 
                  style={{ width: results.processed ? `${(results.deadCards.length / results.processed) * 100}%` : '0%' }}
                ></div>
              </div>
              <div className="mt-1 text-right text-xs text-zinc-500">
                {results.processed ? ((results.deadCards.length / results.processed) * 100).toFixed(1) : 0}%
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex justify-between">
                <span className="text-zinc-400 text-sm">Unknown</span>
                <span className="text-zinc-400 text-sm">{results.unknownCards.length}</span>
              </div>
              <div className="mt-1 w-full bg-zinc-800 rounded-full h-1.5">
                <div 
                  className="bg-zinc-600 h-1.5 rounded-full" 
                  style={{ width: results.processed ? `${(results.unknownCards.length / results.processed) * 100}%` : '0%' }}
                ></div>
              </div>
              <div className="mt-1 text-right text-xs text-zinc-500">
                {results.processed ? ((results.unknownCards.length / results.processed) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}