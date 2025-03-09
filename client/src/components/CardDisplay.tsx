import { CardState } from "@/types/card";
import { cardTypes } from "@/utils/cardValidation";
import { formatCardNumber } from "@/utils/cardValidation";

interface CardDisplayProps {
  cardState: CardState;
}

export default function CardDisplay({ cardState }: CardDisplayProps) {
  const cardType = cardState.cardType || 'unknown';
  
  // Use dynamic bank background based on card type
  const bankStyle = cardTypes[cardType]?.backgroundStyle || 'bg-gradient-to-br from-slate-800 to-slate-950';
  const bankName = cardTypes[cardType]?.bankName || 'Unknown';

  return (
    <div 
      className={`relative mx-6 -mt-6 rounded-lg shadow-2xl transition-all duration-300 h-52 p-5 ${bankStyle} border border-slate-700/50`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[radial-gradient(rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>
      
      {/* Card overlay effect - bank shimmer */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-lg"></div>
      
      {/* Card brand logo */}
      <div className="absolute top-0 right-0 m-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black/30 border border-white/10 text-white backdrop-blur-sm">
          {cardTypes[cardType]?.logo || '?'}
        </div>
      </div>
      
      <div className="flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start">
          <div className="w-14 h-9 mb-4 rounded bg-gradient-to-r from-yellow-400 to-yellow-300 shadow-md flex items-center justify-center">
            <span className="text-black text-xs font-bold">EMV</span>
          </div>
          <div className="text-white text-sm font-bold opacity-70">
            {bankName}
          </div>
        </div>
        <div>
          <div className="text-white text-xl tracking-wider mb-4 font-mono relative">
            <div className="absolute -top-5 -left-1 text-blue-400 text-xs font-bold">Tripl3sixMafia</div>
            {cardState.number 
              ? formatCardNumber(cardState.number) 
              : '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-gray-300 text-xs uppercase font-semibold">Card Holder</p>
              <p className="text-white">
                {cardState.holder ? cardState.holder.toUpperCase() : 'YOUR NAME'}
              </p>
            </div>
            <div>
              <p className="text-gray-300 text-xs uppercase font-semibold">Expires</p>
              <p className="text-white">
                {cardState.expiry || 'MM/YY'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bank logo watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 text-white text-5xl font-bold pointer-events-none select-none">
        {cardTypes[cardType]?.logo || ''}
      </div>
      
      {/* Hologram effect */}
      <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-blue-500/30 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <div className="text-white opacity-60 text-[10px] font-bold rotate-45">3-6</div>
      </div>
    </div>
  );
}
