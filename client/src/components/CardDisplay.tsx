import { CardState } from "@/types/card";
import { cardTypes } from "@/utils/cardValidation";
import { formatCardNumber } from "@/utils/cardValidation";

interface CardDisplayProps {
  cardState: CardState;
}

export default function CardDisplay({ cardState }: CardDisplayProps) {
  const cardType = cardState.cardType || 'unknown';
  
  // Custom red theme for all cards
  const colorGradient = 'from-red-900 via-red-950 to-black';

  return (
    <div 
      className={`relative mx-6 -mt-6 rounded-lg shadow-2xl transition-all duration-300 h-52 p-5 bg-gradient-to-br ${colorGradient} border border-red-800/30`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="w-full h-full bg-[radial-gradient(#ff0000_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>
      
      {/* Card overlay effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-black/0 via-black/0 to-red-900/10 rounded-lg"></div>
      
      {/* Card brand logo */}
      <div className="absolute top-0 right-0 m-4">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-black/30 border border-red-800/50 text-white backdrop-blur-sm">
          {cardTypes[cardType]?.logo || '3-6'}
        </div>
      </div>
      
      <div className="flex flex-col justify-between h-full relative z-10">
        <div>
          <div className="w-14 h-9 mb-4 rounded bg-gradient-to-r from-yellow-400 to-yellow-300 shadow-md flex items-center justify-center">
            <span className="text-black text-xs font-bold">EMV</span>
          </div>
        </div>
        <div>
          <div className="text-white text-xl tracking-wider mb-4 font-mono relative">
            <div className="absolute -top-5 -left-1 text-red-500 text-xs font-bold">Tripl3sixMafia</div>
            {cardState.number 
              ? formatCardNumber(cardState.number) 
              : '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase font-semibold">Card Holder</p>
              <p className="text-white">
                {cardState.holder ? cardState.holder.toUpperCase() : 'YOUR NAME'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-semibold">Expires</p>
              <p className="text-white">
                {cardState.expiry || 'MM/YY'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hologram effect */}
      <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 via-purple-500/30 to-blue-500/30 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <div className="text-white opacity-60 text-[10px] font-bold rotate-45">3-6</div>
      </div>
    </div>
  );
}
