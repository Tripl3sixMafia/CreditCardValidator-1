import { useState } from "react";
import CreditCardValidator from "@/components/CreditCardValidator";
import BulkCardValidator from "@/components/BulkCardValidator";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  
  return (
    <div className="bg-gradient-to-b from-black to-zinc-900 min-h-screen flex flex-col items-center p-4 font-sans text-white">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,215,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
      
      {/* Header */}
      <div className="mt-8 mb-6 text-center z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tighter">
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 text-transparent bg-clip-text">
            Tripl3sixMafia
          </span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-300 to-amber-500 text-transparent bg-clip-text">
          Card Verification System
        </h2>
        <p className="text-zinc-300 mt-2 max-w-md mx-auto">
          Premium card validation with multi-processor support. Verify cards before processing payments.
        </p>
      </div>
      
      {/* Tabs */}
      <div className="w-full max-w-md mb-6 z-10">
        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              activeTab === 'single' 
                ? 'text-amber-400 border-b-2 border-amber-500' 
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Single Card Check
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              activeTab === 'bulk' 
                ? 'text-amber-400 border-b-2 border-amber-500' 
                : 'text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Bulk Validation
          </button>
        </div>
      </div>
      
      {/* Card Validator Components */}
      <div className="z-10 w-full max-w-md">
        {activeTab === 'single' ? (
          <CreditCardValidator />
        ) : (
          <BulkCardValidator />
        )}
      </div>
      
      {/* Supported Processors */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-900/30 flex items-center justify-center border border-amber-800/50">
            <span className="text-amber-400 font-bold">Stripe</span>
          </div>
          <span className="text-zinc-400 text-xs mt-2">Live</span>
        </div>
        <div className="flex flex-col items-center opacity-50">
          <div className="w-16 h-16 rounded-full bg-zinc-800/30 flex items-center justify-center border border-zinc-700/50">
            <span className="text-zinc-400 font-bold">PayPal</span>
          </div>
          <span className="text-zinc-500 text-xs mt-2">Coming Soon</span>
        </div>
        <div className="flex flex-col items-center opacity-50">
          <div className="w-16 h-16 rounded-full bg-zinc-800/30 flex items-center justify-center border border-zinc-700/50">
            <span className="text-zinc-400 font-bold">Square</span>
          </div>
          <span className="text-zinc-500 text-xs mt-2">Coming Soon</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-zinc-500 text-xs z-10">
        <p>© {new Date().getFullYear()} Tripl3sixMafia Advanced Card Verification | <span className="text-amber-500">Enterprise Edition</span></p>
      </div>
    </div>
  );
}
