import { useState, useEffect } from 'react';
import { useWalletAuth } from './useWalletAuth';
import { User } from '../lib/supabase';

const ADMIN_WALLET_ADDRESS = '0x6819143a95aeed963348b5f1e9c9405999bd1588';

export function useAdminAuth() {
  const { address, user, isConnected, loading: walletLoading } = useWalletAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Give wallet auth a moment to initialize
    const checkTimer = setTimeout(() => {
      setIsChecking(false);
    }, 500);

    return () => clearTimeout(checkTimer);
  }, []);

  useEffect(() => {
    if (isChecking) return; // Wait for initial check

    if (isConnected && address) {
      const addressLower = address.toLowerCase();
      const adminAddressLower = ADMIN_WALLET_ADDRESS.toLowerCase();
      
      console.log('[useAdminAuth] Checking admin access:', {
        currentAddress: addressLower,
        adminAddress: adminAddressLower,
        match: addressLower === adminAddressLower,
        isConnected,
        hasUser: !!user
      });
      
      if (addressLower === adminAddressLower) {
        console.log('[useAdminAuth] Admin access granted');
        setIsAdmin(true);
        setAdminUser(user);
      } else {
        setIsAdmin(false);
        setAdminUser(null);
      }
    } else {
      setIsAdmin(false);
      setAdminUser(null);
    }
  }, [address, isConnected, user, isChecking]);

  return {
    isAdmin,
    adminUser,
    adminWalletAddress: ADMIN_WALLET_ADDRESS,
    loading: isChecking || walletLoading,
  };
}

