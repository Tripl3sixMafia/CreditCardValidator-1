import React from 'react';

interface BinDataCountry {
  numeric: string;
  alpha2: string;
  name: string;
  emoji: string;
  currency: string;
  latitude: number;
  longitude: number;
}

interface BinDataBank {
  name: string;
  url: string;
  phone: string;
  city: string;
}

interface BinDataNumber {
  length: number;
  luhn: boolean;
}

export interface BinData {
  number: BinDataNumber;
  scheme: string;
  type: string;
  brand: string;
  prepaid: boolean;
  country: BinDataCountry;
  bank: BinDataBank;
}

interface BinDisplayProps {
  binData: BinData | null;
  className?: string;
}

const BinDisplay: React.FC<BinDisplayProps> = ({ binData, className = '' }) => {
  if (!binData) {
    return (
      <div className={`text-zinc-500 text-sm italic ${className}`}>
        BIN information not available
      </div>
    );
  }

  return (
    <div className={`bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-amber-400 text-lg font-semibold mb-3">
        BIN Information
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-3">
            <div className="text-zinc-400 text-sm">Card Scheme</div>
            <div className="text-white font-medium flex items-center">
              <span className="capitalize">{binData.scheme || 'Unknown'}</span>
              {binData.brand && (
                <span className="ml-1 text-amber-300"> ({binData.brand})</span>
              )}
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-zinc-400 text-sm">Card Type</div>
            <div className="text-white font-medium capitalize">
              {binData.type || 'Unknown'}
              {binData.prepaid && (
                <span className="ml-1 text-amber-300">(Prepaid)</span>
              )}
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-zinc-400 text-sm">Card Details</div>
            <div className="text-white font-medium">
              Length: {binData.number?.length || 'Unknown'} digits
              {binData.number?.luhn !== undefined && (
                <span className="ml-2">
                  Luhn: {binData.number.luhn ? 'Valid' : 'Invalid'}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="mb-3">
            <div className="text-zinc-400 text-sm">Issuing Bank</div>
            <div className="text-white font-medium flex flex-col">
              <span>{binData.bank?.name || 'Unknown'}</span>
              {binData.bank?.city && (
                <span className="text-sm text-zinc-400">{binData.bank.city}</span>
              )}
              {binData.bank?.url && (
                <a 
                  href={binData.bank.url.startsWith('http') ? binData.bank.url : `https://${binData.bank.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-amber-400 hover:text-amber-300 truncate"
                >
                  {binData.bank.url}
                </a>
              )}
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-zinc-400 text-sm">Country</div>
            <div className="text-white font-medium flex items-center">
              {binData.country?.emoji && (
                <span className="mr-2 text-lg">{binData.country.emoji}</span>
              )}
              <span>
                {binData.country?.name || 'Unknown'}
                {binData.country?.currency && (
                  <span className="ml-2 text-amber-300">({binData.country.currency})</span>
                )}
              </span>
            </div>
          </div>
          
          {binData.bank?.phone && (
            <div className="mb-3">
              <div className="text-zinc-400 text-sm">Contact</div>
              <div className="text-white font-medium">
                {binData.bank.phone}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BinDisplay;