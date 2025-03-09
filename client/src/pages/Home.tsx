import CreditCardValidator from "@/components/CreditCardValidator";

export default function Home() {
  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tighter">
          <span className="glitch-text bg-gradient-to-r from-red-500 to-red-700 text-transparent bg-clip-text">
            Tripl3sixMafia
          </span>
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-red-600 to-red-400 text-transparent bg-clip-text">
          CC Checker
        </h2>
        <p className="text-gray-400 mt-2 max-w-md mx-auto">
          Validate your cards before making online purchases. Check for active status in real-time.
        </p>
      </div>
      <CreditCardValidator />
      <div className="mt-8 text-center text-gray-600 text-xs">
        <p>© {new Date().getFullYear()} Tripl3sixMafia CC | Secure Validation</p>
      </div>
    </div>
  );
}
