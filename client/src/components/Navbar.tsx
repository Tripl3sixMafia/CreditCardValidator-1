import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Logo } from './Logo';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [location] = useLocation();
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication status on mount and when location changes
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiRequest('GET', '/api/me');
        const userData = await response.json();
        
        if (userData && (userData.id || (userData.user && userData.user.id))) {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, [location]);
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/logout');
      setIsLoggedIn(false);
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: "Logout Successful",
        description: "You have been logged out",
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: "Logout Failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };
  
  return (
    <nav className="bg-zinc-900 border-b border-zinc-800 py-4">
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo className="w-10 h-10" />
          <span className="ml-2 text-xl font-bold text-white">CardChecker</span>
        </Link>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-zinc-400 hover:text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* Desktop navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            href="/"
            className={`text-sm ${location === '/' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
          >
            Home
          </Link>
          
          {isLoggedIn ? (
            <>
              <Link 
                href="/account"
                className={`text-sm ${location === '/account' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
              >
                My Account
              </Link>
              
              <Link href="/account">
                <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm">
                  Dashboard
                </button>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/login"
                className={`text-sm ${location === '/login' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
              >
                Sign In
              </Link>
              
              <Link href="/register">
                <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm">
                  Sign Up
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-2 border-t border-zinc-800 pt-2 pb-4">
          <div className="space-y-3 px-4">
            <Link 
              href="/"
              className={`block text-sm ${location === '/' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {isLoggedIn ? (
              <>
                <Link 
                  href="/account"
                  className={`block text-sm ${location === '/account' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  My Account
                </Link>
                
                <Link 
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm">
                    Dashboard
                  </button>
                </Link>
                
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left mt-3 text-sm text-zinc-400 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login"
                  className={`block text-sm ${location === '/login' ? 'text-amber-500' : 'text-zinc-400 hover:text-white'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                
                <Link 
                  href="/register"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button className="w-full mt-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm">
                    Sign Up
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}