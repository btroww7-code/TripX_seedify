import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getOrCreateUser, getUserByWallet } from '../services/userService';
import { getTPXBalance, getNFTPassportTokenId, clearTPXBalanceCache } from '../services/web3Service';
import { mintPassportAPI } from '../services/web3ApiClient';
import { supabase } from '../lib/supabase';
import { User } from '../lib/supabase';
import {
  createSession,
  validateSession,
  deleteSession,
  clearSession,
  hasSession,
  isNewSession,
  setupSessionCleanup,
} from '../services/sessionService';

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [tpxBalance, setTpxBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Setup session cleanup on browser close
  useEffect(() => {
    const cleanup = setupSessionCleanup();
    return cleanup;
  }, []);

  // Check existing session on mount (DISABLED for hackathon - keep sessions alive)
  useEffect(() => {
    const checkExistingSession = async () => {
      // HACKATHON MODE: Don't clear sessions on reload
      // Clear the closing flag if it exists (from old code)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tripx_session_closing');
      }
      
      // Check if we have an active Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[WalletAuth] Existing Supabase session:', session ? 'Active' : 'None');
      
      if (session) {
        console.log('[WalletAuth] Session preserved from previous load');
      }
    };
    
    checkExistingSession();
  }, []);

  // Track previous connection state to detect disconnects
  const [wasConnected, setWasConnected] = useState(false);
  
  useEffect(() => {
    // Detect when wallet disconnects (was connected, now not)
    if (wasConnected && (!isConnected || !address)) {
      console.log('[WalletAuth] Wallet disconnected - performing full cleanup');
      // Full cleanup on disconnect
      setUser(null);
      setTpxBalance(0);
      clearSession();
      clearTPXBalanceCache();
      // Sign out from Supabase
      supabase.auth.signOut().catch(err => {
        console.warn('[WalletAuth] Error signing out on disconnect:', err);
      });
      setWasConnected(false);
      return;
    }
    
    // Update connection state
    if (isConnected && address) {
      setWasConnected(true);
    }

    // Prevent multiple simultaneous loads for the same address
    // But only if we're not currently loading
    if (user && user.wallet_address?.toLowerCase() === address.toLowerCase() && !loading) {
      console.log('[WalletAuth] User already loaded for this address, skipping');
      return;
    }

    // Clear previous user data when address changes
    if (!user || user.wallet_address?.toLowerCase() !== address.toLowerCase()) {
      console.log('[WalletAuth] New wallet address detected or user mismatch:', address);
      setUser(null);
      setTpxBalance(0);
    }

    const loadUserData = async () => {
      setLoading(true);
      try {
        // Get user agent for tracking
        const userAgent = typeof window !== 'undefined' ? navigator.userAgent : null;
        
        console.log('[WalletAuth] Loading user profile for wallet:', address);
        
        // Get or create user profile (IP will be tracked on server-side if available)
        const userProfile = await getOrCreateUser(address);
        if (!userProfile) {
          console.error('[WalletAuth] Failed to load user profile');
          setLoading(false);
          return;
        }
        
        console.log('[WalletAuth] User profile loaded:', {
          id: userProfile.id,
          wallet: userProfile.wallet_address,
          xp: userProfile.total_xp,
          quests: userProfile.quests_completed
        });
        
        // Update login tracking if user already exists
        if (userProfile.id) {
          const { error: trackingError } = await supabase.rpc('update_user_login_tracking', {
            p_user_id: userProfile.id,
            p_login_ip: null, // IP will be set on server-side
            p_user_agent: userAgent
          });
          if (trackingError) {
            console.warn('Error updating login tracking:', trackingError);
          }
        }
        
        // Create Supabase Auth session for wallet users (required for Storage RLS)
        // Use deterministic email/password based on wallet address for hackathon
        console.log('[WalletAuth] Creating Supabase auth session...');
        const walletEmail = `${address.toLowerCase()}@wallet.tripx.local`;
        const walletPassword = `tripx_${address.toLowerCase()}_2025`; // Deterministic password
        
        // Try to sign in first
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: walletEmail,
          password: walletPassword
        });
        
        // If user doesn't exist, create account
        if (authError && authError.message?.includes('Invalid login credentials')) {
          console.log('[WalletAuth] Creating new auth user for wallet...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: walletEmail,
            password: walletPassword,
            options: {
              data: {
                wallet_address: address.toLowerCase(),
                user_id: userProfile.id
              },
              emailRedirectTo: undefined // Skip email confirmation
            }
          });
          
          if (signUpError) {
            console.error('[WalletAuth] Auth signup failed:', signUpError);
          } else {
            authData = signUpData;
            console.log('[WalletAuth] Auth user created:', signUpData.session?.user.id);
          }
        } else if (authError) {
          console.error('[WalletAuth] Auth signin failed:', authError);
        } else {
          console.log('[WalletAuth] Auth session restored:', authData.session?.user.id);
        }
        
        setUser(userProfile);

        // Create session with full tracking data
        if (userProfile.id && address) {
          console.log('[WalletAuth] Creating session with tracking...');
          await createSession(userProfile.id, address.toLowerCase(), userProfile.email || undefined);
        }

        // Load TPX balance (from blockchain) - clear cache first to ensure fresh data
        clearTPXBalanceCache();
        const balance = await getTPXBalance(address);
        setTpxBalance(balance);
        console.log('[WalletAuth] TPX Balance loaded:', balance);

        // NOTE: Auto-suggest TPX token is now handled by manual button click in UI
        // to prevent constant MetaMask popups. See Dashboard or Profile for "Add TPX to MetaMask" button.
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    // Refresh balance every 30 seconds
    const balanceInterval = setInterval(async () => {
      if (address) {
        clearTPXBalanceCache();
        const balance = await getTPXBalance(address);
        setTpxBalance(balance);
      }
    }, 30000);

    // Listen for manual balance update events (e.g., after quest completion)
    const handleBalanceUpdate = async (event: CustomEvent) => {
      console.log('[WalletAuth] Balance update event received:', event.detail);
      if (address && event.detail.walletAddress?.toLowerCase() === address.toLowerCase()) {
        console.log('[WalletAuth] Refreshing TPX balance...');
        clearTPXBalanceCache();
        const balance = await getTPXBalance(address);
        setTpxBalance(balance);
        console.log('[WalletAuth] TPX balance updated:', balance);
      }
    };

    // Listen for user data update events (e.g., after quest completion - XP, level changes)
    const handleUserDataUpdate = async (event: CustomEvent) => {
      console.log('[WalletAuth] User data update event received:', event.detail);
      if (address && event.detail.walletAddress?.toLowerCase() === address.toLowerCase()) {
        console.log('[WalletAuth] Refreshing user data (XP, level)...');
        try {
          const { getOrCreateUser } = await import('../services/userService');
          const updatedUser = await getOrCreateUser(address);
          if (updatedUser) {
            setUser(updatedUser);
            console.log('[WalletAuth] User data updated:', {
              xp: updatedUser.total_xp,
              level: updatedUser.level,
              quests: updatedUser.quests_completed
            });
          }
        } catch (error) {
          console.error('[WalletAuth] Error refreshing user data:', error);
        }
      }
    };

    window.addEventListener('tpxBalanceUpdated', handleBalanceUpdate as EventListener);
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      clearInterval(balanceInterval);
      window.removeEventListener('tpxBalanceUpdated', handleBalanceUpdate as EventListener);
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [address, isConnected]);

  // Sign out function - defined outside useEffect so it's always available
  const signOut = useCallback(async () => {
    try {
      console.log('[WalletAuth] Signing out...');
      
      // IMPORTANT: Clear local state IMMEDIATELY (before any async operations)
      setUser(null);
      setTpxBalance(0);
      
      // Clear session from localStorage IMMEDIATELY
      clearSession();
      
      // Clear any cached data IMMEDIATELY
      clearTPXBalanceCache();
      
      // Delete session from database (async, but don't wait)
      deleteSession('logout').catch(sessionError => {
        console.warn('[WalletAuth] Error deleting session (continuing):', sessionError);
      });
      
      // Sign out from Supabase auth (async, but don't wait)
      supabase.auth.signOut().then(({ error: signOutError }) => {
        if (signOutError) {
          console.warn('[WalletAuth] Error signing out from Supabase:', signOutError);
        } else {
          console.log('[WalletAuth] Supabase session cleared');
        }
      }).catch(authError => {
        console.warn('[WalletAuth] Exception during Supabase signOut:', authError);
      });
      
      console.log('[WalletAuth] Signed out successfully (local state cleared)');
    } catch (error) {
      console.error('[WalletAuth] Error signing out:', error);
      // Always clear local state even if there's an error
      setUser(null);
      setTpxBalance(0);
      clearSession();
      clearTPXBalanceCache();
    }
  }, []);

  return {
    user,
    tpxBalance,
    loading,
    isConnected,
    address,
    signOut,
  };
}

