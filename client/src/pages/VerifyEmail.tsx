import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useSearch } from 'wouter';

export default function VerifyEmail() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get('token');
  const { toast } = useToast();

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        toast({
          title: 'Verification failed',
          description: 'Missing verification token',
          variant: 'destructive',
        });
        setIsVerifying(false);
        setLocation('/login');
        return;
      }

      try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const result = await response.json();

        if (result.success) {
          toast({
            title: 'Email verified',
            description: 'Your email has been verified. You can now log in.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Verification failed',
            description: result.message || 'Email verification failed. Please try again or contact support.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Verification error:', error);
        toast({
          title: 'Verification failed',
          description: 'An unexpected error occurred during verification.',
          variant: 'destructive',
        });
      } finally {
        setIsVerifying(false);
        setLocation('/login');
      }
    }

    verifyEmail();
  }, [token, toast, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl text-center">
        {isVerifying ? (
          <>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
            <h2 className="text-xl font-bold text-white">Verifying your email</h2>
            <p className="mt-2 text-zinc-400">
              Please wait while we verify your email address...
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Redirecting to login</h2>
            <p className="mt-2 text-zinc-400">
              You will be redirected to the login page in a moment...
            </p>
          </>
        )}
      </div>
    </div>
  );
}