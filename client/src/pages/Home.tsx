import CreditCardValidator from "@/components/CreditCardValidator";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-slate-950 to-blue-950 min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
      
      {/* Header */}
      <div className="mb-8 text-center z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tighter">
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
            Tripl3sixMafia
          </span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-400 text-transparent bg-clip-text">
          Card Verification System
        </h2>
        <p className="text-slate-300 mt-2 max-w-md mx-auto">
          Professional card validation with multi-processor support. Verify cards before processing payments.
        </p>
      </div>
      
      {/* Card Validator Component */}
      <div className="z-10 w-full max-w-md">
        <CreditCardValidator />
      </div>
      
      {/* Supported Processors */}
      <div className="mt-8 flex flex-wrap justify-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-800/50">
            <span className="text-blue-400 font-bold">Stripe</span>
          </div>
          <span className="text-slate-400 text-xs mt-2">Live</span>
        </div>
        <div className="flex flex-col items-center opacity-50">
          <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center border border-slate-700/50">
            <span className="text-slate-400 font-bold">PayPal</span>
          </div>
          <span className="text-slate-500 text-xs mt-2">Coming Soon</span>
        </div>
        <div className="flex flex-col items-center opacity-50">
          <div className="w-16 h-16 rounded-full bg-slate-800/30 flex items-center justify-center border border-slate-700/50">
            <span className="text-slate-400 font-bold">Square</span>
          </div>
          <span className="text-slate-500 text-xs mt-2">Coming Soon</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-slate-500 text-xs z-10">
        <p>© {new Date().getFullYear()} Tripl3sixMafia Advanced Card Verification | <span className="text-blue-500">Enterprise Edition</span></p>
      </div>
    </div>
  );
}
