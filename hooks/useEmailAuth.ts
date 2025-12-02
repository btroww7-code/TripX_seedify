import { useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';
import { getTPXBalance } from '../services/web3Service';
import {
  createSession,
  validateSession,
  deleteSession,
  clearSession,
  isNewSession,
  setupSessionCleanup,
} from '../services/sessionService';

export function useEmailAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [tpxBalance, setTpxBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);

  // Setup session cleanup on browser close
  useEffect(() => {
    const cleanup = setupSessionCleanup();
    return cleanup;
  }, []);

  // Check existing session (DISABLED session clearing for hackathon)
  useEffect(() => {
    const checkExistingSession = async () => {
      // HACKATHON MODE: Don't clear sessions on reload
      // Clear the closing flag if it exists (from old code)
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('tripx_session_closing');
      }
      
      // Check if we have an active Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[EmailAuth] Existing Supabase session:', session ? 'Active' : 'None');
      
      if (session) {
        console.log('[EmailAuth] Session preserved from previous load');
      }
    };
    
    checkExistingSession();
  }, []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Ignore wallet user sessions (they are handled by useWalletAuth)
      if (session?.user?.email?.endsWith('@wallet.tripx.local')) {
        console.log('[EmailAuth] Ignoring wallet user session on mount');
        return;
      }
      
      if (session) {
        console.log('[EmailAuth] Email user session found on mount');
        setAuthUser(session.user);
        loadUserData(session.user);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[EmailAuth] Auth state changed:', event, 'user:', session?.user?.email);
      
      // Ignore wallet user sessions (they are handled by useWalletAuth)
      if (session?.user?.email?.endsWith('@wallet.tripx.local')) {
        console.log('[EmailAuth] Ignoring wallet user session');
        return;
      }
      
      if (session?.user) {
        // Only handle email-based auth sessions
        console.log('[EmailAuth] Email user session detected - loading user data');
        setAuthUser(session.user);
        await loadUserData(session.user);
      } else {
        // Only clear if we had an email user (not wallet user)
        if (authUser && !authUser.email?.endsWith('@wallet.tripx.local')) {
          console.log('[EmailAuth] Email user logged out - clearing all data');
          await deleteSession('logout');
          setAuthUser(null);
          setUser(null);
          setTpxBalance(0);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (authUser: any) => {
    if (!authUser) return;

    setLoading(true);
    try {
      // Get user agent and try to get IP (will be null on client-side)
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : null;
      
      // Get or create user by email
      const { data: userData, error } = await supabase
        .rpc('get_or_create_user_by_email', {
          user_email: authUser.email,
          auth_uuid: authUser.id,
        });

      if (error) {
        console.error('Error getting user:', error);
        // Fallback: try direct query
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .maybeSingle();

        if (fallbackUser) {
          // Update login tracking
          const { error: trackingError } = await supabase.rpc('update_user_login_tracking', {
            p_user_id: fallbackUser.id,
            p_login_ip: null, // IP will be set on server-side
            p_user_agent: userAgent
          });
          if (trackingError) {
            console.warn('Error updating login tracking:', trackingError);
          }
          
          setUser(fallbackUser as User);
        }
        return;
      }

      if (userData) {
        // Update login tracking for existing user
        const { error: trackingError } = await supabase.rpc('update_user_login_tracking', {
          p_user_id: userData.id,
          p_login_ip: null, // IP will be set on server-side
          p_user_agent: userAgent
        });
        if (trackingError) {
          console.warn('Error updating login tracking:', trackingError);
        }
        
        // Session tracking disabled for hackathon (database functions missing)
        // TODO: Re-enable after adding create_user_session RPC function
        /*
        const sessionToken = await createSession(
          userData.id,
          userData.wallet_address || undefined,
          authUser.email
        );
        
        if (!sessionToken) {
          console.warn('[EmailAuth] Failed to create session');
        } else {
          console.log('[EmailAuth] Session created successfully');
        }
        */
        
        setUser(userData as User);
        // Load TPX balance (from Supabase for now, contract later)
        const balance = await getTPXBalance(userData.wallet_address || userData.email || '');
        setTpxBalance(balance);
        
        // Listen for balance update events
        const handleBalanceUpdate = async (event: CustomEvent) => {
          console.log('[EmailAuth] Balance update event received:', event.detail);
          if (userData.id === event.detail.userId) {
            console.log('[EmailAuth] Refreshing TPX balance...');
            const { clearTPXBalanceCache } = await import('../services/web3Service');
            clearTPXBalanceCache();
            const newBalance = await getTPXBalance(userData.wallet_address || userData.email || '');
            setTpxBalance(newBalance);
            console.log('[EmailAuth] TPX balance updated:', newBalance);
          }
        };

        // Listen for user data update events (e.g., after quest completion - XP, level changes)
        const handleUserDataUpdate = async (event: CustomEvent) => {
          console.log('[EmailAuth] User data update event received:', event.detail);
          if (userData.id === event.detail.userId) {
            console.log('[EmailAuth] Refreshing user data (XP, level)...');
            try {
              const { data: updatedUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userData.id)
                .single();

              if (error) {
                console.error('[EmailAuth] Error fetching updated user data:', error);
              } else if (updatedUser) {
                setUser(updatedUser as User);
                console.log('[EmailAuth] User data updated:', {
                  xp: updatedUser.total_xp,
                  level: updatedUser.level,
                  quests: updatedUser.quests_completed
                });
              }
            } catch (error) {
              console.error('[EmailAuth] Error refreshing user data:', error);
            }
          }
        };
        
        window.addEventListener('tpxBalanceUpdated', handleBalanceUpdate as EventListener);
        window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
        
        // Store cleanup function
        return () => {
          window.removeEventListener('tpxBalanceUpdated', handleBalanceUpdate as EventListener);
          window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
        };
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    console.log('[EmailAuth] Signing out...');
    
    // IMPORTANT: Clear local state IMMEDIATELY
    setUser(null);
    setAuthUser(null);
    setTpxBalance(0);
    
    // Clear session from localStorage IMMEDIATELY
    import('../services/sessionService').then(({ clearSession }) => {
      clearSession();
    });
    
    // Delete session from database (async, don't wait)
    deleteSession('logout').catch(err => {
      console.warn('[EmailAuth] Error deleting session:', err);
    });
    
    // Sign out from Supabase auth (async, don't wait)
    supabase.auth.signOut().then(({ error }) => {
      if (error) {
        console.error('[EmailAuth] Error signing out from Supabase:', error);
      } else {
        console.log('[EmailAuth] Signed out successfully');
      }
    }).catch(err => {
      console.error('[EmailAuth] Exception during signOut:', err);
    });
  };

  return {
    user,
    tpxBalance,
    loading,
    isAuthenticated: !!authUser,
    email: authUser?.email || null,
    signOut,
  };
}

