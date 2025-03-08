import { CardState } from "@/types/card";
import { cardTypes } from "@/utils/cardValidation";
import { formatCardNumber } from "@/utils/cardValidation";

interface CardDisplayProps {
  cardState: CardState;
}

export default function CardDisplay({ cardState }: CardDisplayProps) {
  const cardType = cardState.cardType || 'unknown';
  const colorGradient = cardTypes[cardType]?.color || 'from-gray-700 to-gray-900';

  return (
    <div 
      className={`relative mx-6 -mt-6 rounded-lg shadow-md transition-all duration-300 h-48 p-5 bg-gradient-to-r ${colorGradient}`}
    >
      <div className="absolute top-0 right-0 m-4">
        <div className="w-12 h-12 flex items-center justify-center rounded bg-white/20 text-white">
          {cardTypes[cardType]?.logo || '?'}
        </div>
      </div>
      <div className="flex flex-col justify-between h-full">
        <div>
          <div className="w-12 h-8 mb-4 rounded bg-gradient-to-r from-yellow-400 to-yellow-300"></div>
        </div>
        <div>
          <div className="text-white text-xl tracking-wider mb-4 font-mono">
            {cardState.number 
              ? formatCardNumber(cardState.number) 
              : '•••• •••• •••• ••••'}
          </div>
          <div className="flex justify-between">
            <div>
              <p className="text-gray-300 text-xs uppercase">Card Holder</p>
              <p className="text-white">
                {cardState.holder ? cardState.holder.toUpperCase() : 'YOUR NAME'}
              </p>
            </div>
            <div>
              <p className="text-gray-300 text-xs uppercase">Expires</p>
              <p className="text-white">
                {cardState.expiry || 'MM/YY'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
