import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';

// Telegram bot settings schema
const telegramBotSchema = z.object({
  telegramBotToken: z.string().min(20, 'Bot token must be at least 20 characters long'),
  telegramChatId: z.string().min(5, 'Chat ID must be at least 5 characters long'),
  stripeSecretKey: z.string().optional(),
});

type TelegramBotSettings = z.infer<typeof telegramBotSchema>;

export default function Account() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch current user data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['/api/me'],
    queryFn: getQueryFn({ on401: 'throw' }),
    retry: false,
    onError: () => {
      // Redirect to login if not authenticated
      setLocation('/login');
    }
  });
  
  // Fetch current Telegram settings
  const { data: telegramData, isLoading: telegramLoading } = useQuery({
    queryKey: ['/api/telegram-settings'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    retry: false,
    enabled: !!userData?.user,
  });
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TelegramBotSettings>({
    resolver: zodResolver(telegramBotSchema),
    defaultValues: {
      telegramBotToken: '',
      telegramChatId: '',
      stripeSecretKey: ''
    }
  });
  
  // Update form with current settings when data loads
  useEffect(() => {
    if (telegramData?.settings) {
      reset(telegramData.settings);
    }
  }, [telegramData, reset]);
  
  // Mutation for updating Telegram settings
  const updateTelegramMutation = useMutation({
    mutationFn: async (data: TelegramBotSettings) => {
      const response = await apiRequest('POST', '/api/telegram-settings', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Settings updated',
          description: 'Your Telegram bot has been configured successfully.',
          variant: 'default',
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/telegram-settings'] });
      } else {
        toast({
          title: 'Update failed',
          description: data.message || 'Failed to update Telegram settings.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Telegram settings update error:', error);
      toast({
        title: 'Update failed',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    }
  });
  
  const onSubmit = (data: TelegramBotSettings) => {
    updateTelegramMutation.mutate(data);
  };
  
  const handleLogout = async () => {
    try {
      const response = await apiRequest('POST', '/api/logout', {});
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: 'Logged out',
          description: 'You have been logged out successfully.',
          variant: 'default',
        });
        
        // Clear queries and redirect to home
        queryClient.clear();
        setLocation('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    }
  };
  
  // Show loading state
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-zinc-700 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading your account...</p>
        </div>
      </div>
    );
  }
  
  // Show error state (should redirect to login)
  if (userError || !userData?.user) {
    return null;
  }
  
  const { user } = userData;
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Information */}
        <div className="md:col-span-1">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-400">Name</p>
                <p className="text-white font-medium">{user.name}</p>
              </div>
              
              <div>
                <p className="text-sm text-zinc-400">Email</p>
                <p className="text-white font-medium">{user.email}</p>
                {user.emailVerified ? (
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-400">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-400">
                    Not Verified
                  </span>
                )}
              </div>
              
              <div>
                <p className="text-sm text-zinc-400">Telegram Bot</p>
                {user.hasTelegramBot ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-400">
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">
                    Not Configured
                  </span>
                )}
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-4 border border-zinc-600 rounded-md shadow-sm text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 focus:outline-none"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Telegram Bot Settings */}
        <div className="md:col-span-2">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Telegram Bot Settings</h2>
            
            <div className="mb-6">
              <p className="text-zinc-400 text-sm">
                Configure your personal Telegram bot to check cards and generate test data directly from Telegram.
              </p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="telegramBotToken" className="block text-sm font-medium text-zinc-300">
                    Bot Token
                  </label>
                  <input
                    id="telegramBotToken"
                    type="text"
                    {...register('telegramBotToken')}
                    className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    placeholder="123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ"
                  />
                  {errors.telegramBotToken && (
                    <p className="mt-1 text-sm text-red-500">{errors.telegramBotToken.message}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    Create a bot with <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">@BotFather</a> and paste the token here
                  </p>
                </div>
                
                <div>
                  <label htmlFor="telegramChatId" className="block text-sm font-medium text-zinc-300">
                    Chat ID
                  </label>
                  <input
                    id="telegramChatId"
                    type="text"
                    {...register('telegramChatId')}
                    className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    placeholder="123456789"
                  />
                  {errors.telegramChatId && (
                    <p className="mt-1 text-sm text-red-500">{errors.telegramChatId.message}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    Use <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400">@userinfobot</a> to get your Chat ID
                  </p>
                </div>

                <div>
                  <label htmlFor="stripeSecretKey" className="block text-sm font-medium text-zinc-300">
                    Stripe Secret Key (Optional)
                  </label>
                  <input
                    id="stripeSecretKey"
                    type="text"
                    {...register('stripeSecretKey')}
                    className="mt-1 block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md shadow-sm placeholder-zinc-400 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    placeholder="sk_test_XXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                  {errors.stripeSecretKey && (
                    <p className="mt-1 text-sm text-red-500">{errors.stripeSecretKey.message}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    Your personal Stripe secret key for card validation. Used with the <span className="font-mono text-amber-400">/sk</span> command in Telegram.
                  </p>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={updateTelegramMutation.isPending}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateTelegramMutation.isPending ? 'Updating...' : 'Save Telegram Settings'}
                </button>
              </div>
            </form>
            
            {user.hasTelegramBot && (
              <div className="mt-8 p-4 bg-zinc-800 rounded-lg">
                <h3 className="font-medium text-white mb-2">Available Commands</h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-5">
                    <div className="col-span-2 font-mono text-amber-400">/generate 521729</div>
                    <div className="col-span-3 text-zinc-400">Generate 10 cards with BIN 521729</div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2 font-mono text-amber-400">/check 4242...</div>
                    <div className="col-span-3 text-zinc-400">Check card validity (format: number|month|year|cvv)</div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2 font-mono text-amber-400">/random us</div>
                    <div className="col-span-3 text-zinc-400">Generate 10 random cards from country (2-letter code)</div>
                  </div>
                  <div className="grid grid-cols-5">
                    <div className="col-span-2 font-mono text-amber-400">/sk 4242...</div>
                    <div className="col-span-3 text-zinc-400">Check card with your personal Stripe key</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}