import CheckerLayout from "@/components/CheckerLayout";

export default function Home() {
  return (
    <div className="bg-gradient-to-b from-black to-zinc-950 min-h-screen flex flex-col items-center py-6 px-4 font-sans text-white">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.05)_1px,transparent_1px),linear-gradient(to_right,rgba(255,215,0,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>
      
      {/* Header */}
      <div className="mb-6 text-center z-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 text-transparent bg-clip-text">
            Tripl3sixMafia
          </span>
        </h1>
      </div>
      
      {/* Main Layout */}
      <div className="z-10 w-full max-w-6xl mb-8">
        <CheckerLayout />
      </div>
      
      {/* Footer */}
      <div className="text-center text-zinc-600 text-xs z-10 w-full max-w-6xl">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-amber-500/70">Supported Processors:</span>
            <span className="ml-2 text-amber-500">Stripe</span>
            <span className="ml-2 text-zinc-700">PayPal</span>
            <span className="ml-2 text-zinc-700">Square</span>
          </div>
          
          <p>© {new Date().getFullYear()} Tripl3sixMafia | <span className="text-amber-500">Enterprise Edition v1.0</span></p>
        </div>
      </div>
    </div>
  );
}
