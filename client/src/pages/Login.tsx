import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useSearch } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Login form schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const verified = params.get('verified');
  const { toast } = useToast();
  
  useEffect(() => {
    // Handle email verification result
    if (verified === 'true') {
      toast({
        title: 'Email verified',
        description: 'Your email has been verified. You can now log in.',
        variant: 'default',
      });
    } else if (verified === 'false') {
      toast({
        title: 'Verification failed',
        description: 'Email verification failed. Please try again or contact support.',
        variant: 'destructive',
      });
    }
  }, [verified, toast]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });
  
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      const response = await apiRequest('POST', '/api/login', data);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
          variant: 'default',
        });
        
        // Redirect to account page
        setLocation('/account');
      } else {
        toast({
          title: 'Login failed',
          description: result.message || 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to your account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Access your card validation dashboard and Telegram bot settings
          </p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-amber-500 hover:text-amber-400">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}