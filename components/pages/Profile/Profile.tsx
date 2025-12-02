import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Wallet,
  Coins,
  Award,
  Sparkles,
  TrendingUp,
  Calendar,
  MapPin,
  Trophy,
  Zap,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { getUser } from '../../../services/userService';
// Balance is now loaded from useWalletAuth hook
import { TokenTransactionHistory } from '../../TokenTransactionHistory';
import { NFTTransactionHistory } from '../../NFTTransactionHistory';
import { AchievementHistory } from '../../AchievementHistory';
import { AddTPXToMetaMask } from '../../AddTPXToMetaMask';
// ClaimTokensButton removed
import { formatTokenAmount } from '../../../services/tokenService';
import { supabase } from '../../../lib/supabase';

interface ProfileProps {
  onNavigate?: (page: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user: walletUser, address, isConnected: isWalletConnected, tpxBalance: walletTPX } = useWalletAuth();
  const { user: emailUser, isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const user = walletUser || emailUser;
  const isLoggedIn = isWalletConnected || isEmailAuthenticated;
  const tokenBalance = walletTPX || null; // Use balance from hook instead of local state

  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'nfts' | 'achievements'>('overview');
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [nftPassport, setNftPassport] = useState<any>(null);
  const [loadingPassport, setLoadingPassport] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  // Removed pendingRewards state - now handled by ClaimTokensButton
  // Removed claimingRewards state - now handled by ClaimTokensButton

  // Listen for claim complete events to refresh user data
  useEffect(() => {
    const handleClaimComplete = () => {
      console.log('[Profile] Claim complete event received, refreshing data...');
      loadUserData();
    };
    
    window.addEventListener('claimComplete', handleClaimComplete);
    return () => window.removeEventListener('claimComplete', handleClaimComplete);
  }, []);

  React.useEffect(() => {
    console.log('[Profile] User changed:', user?.id, 'address:', address);
    
    // CRITICAL: Clear all data when user changes to prevent showing wrong user's data
    setUserData(null);
    setNftPassport(null);
    setLoadingBalance(false);
    setLoadingPassport(false);
    
    if (user?.id) {
      console.log('[Profile] Loading data for user:', user.id);
      loadUserData();
      // Balance is loaded from useWalletAuth hook
      loadPassportData();
      // Pending rewards now handled by ClaimTokensButton component
    } else {
      console.log('[Profile] No user - showing empty state');
    }
  }, [user?.id, address]);

  const loadUserData = async () => {
    if (!user?.id) return;
    try {
      const data = await getUser(user.id);
      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPassportData = async () => {
    if (!user?.id) return;
    setLoadingPassport(true);
    try {
      console.log('[Profile] Loading passport data for user:', user.id);
      
      // First, check database
      const { data, error } = await supabase
        .from('nft_passports')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      console.log('[Profile] Passport from DB:', data, 'Error:', error);
      
      if (error && error.code !== 'PGRST116') {
        console.error('[Profile] Error loading passport:', error);
      } else if (data && data.token_id) {
        // Passport found in database
        console.log('[Profile] ✅ Passport found in DB:', data.token_id);
        setNftPassport(data);
        setLoadingPassport(false);
        return;
      }
      
      // If no passport in DB, check nft_transactions and blockchain as fallback (for wallet users)
      if (isWalletConnected && address) {
        try {
          // First, check nft_transactions for passport transaction
          console.log('[Profile] No passport in DB, checking nft_transactions...');
          const { data: passportTx, error: txError } = await supabase
            .from('nft_transactions')
            .select('token_id, tx_hash, contract_address, created_at')
            .eq('user_id', user.id)
            .eq('nft_type', 'passport')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          console.log('[Profile] Passport transaction from nft_transactions:', passportTx);
          
          let tokenId: number | null = null;
          
          // If found in transactions, use that token ID
          if (passportTx && passportTx.token_id) {
            tokenId = passportTx.token_id;
            console.log('[Profile] Found passport token ID in nft_transactions:', tokenId);
          } else {
            // Check blockchain as fallback
            console.log('[Profile] No passport in nft_transactions, checking blockchain...');
            const { getNFTPassportTokenId } = await import('../../../services/web3Service');
            const blockchainTokenId = await getNFTPassportTokenId(address);
            
            if (blockchainTokenId && blockchainTokenId > 0) {
              tokenId = blockchainTokenId;
              console.log('[Profile] Found passport on blockchain:', tokenId);
            }
          }
          
          if (tokenId && tokenId > 0) {
            console.log('[Profile] Passport found (tokenId:', tokenId, '), syncing to DB...');
            
            // Get user data for sync
            const userData = await getUser(user.id);
            
            if (userData) {
              // Sync to database
              const { data: syncedPassport, error: syncError } = await supabase
                .from('nft_passports')
                .upsert({
                  user_id: user.id,
                  token_id: tokenId,
                  tier: userData.passport_tier || 'bronze',
                  tx_hash: passportTx?.tx_hash || null,
                  countries_visited: userData.countries_visited || [],
                  quests_completed: userData.quests_completed || 0,
                  total_xp: userData.total_xp || 0,
                }, {
                  onConflict: 'user_id'
                })
                .select()
                .single();
              
              if (!syncError && syncedPassport) {
                console.log('[Profile] ✅ Passport synced to DB');
                setNftPassport(syncedPassport);
              } else {
                console.error('[Profile] Failed to sync passport:', syncError);
                // Still set passport data from available info
                setNftPassport({
                  token_id: tokenId,
                  tier: userData.passport_tier || 'bronze',
                  tx_hash: passportTx?.tx_hash || null,
                  countries_visited: userData.countries_visited || [],
                  quests_completed: userData.quests_completed || 0,
                  total_xp: userData.total_xp || 0,
                });
              }
            }
          } else {
            console.log('[Profile] No passport found in nft_transactions or blockchain');
            setNftPassport(null);
          }
        } catch (blockchainError) {
          console.error('[Profile] Error checking blockchain/transactions:', blockchainError);
          setNftPassport(null);
        }
      } else {
        // Not a wallet user or no address
        setNftPassport(null);
      }
    } catch (error) {
      console.error('[Profile] Error loading passport data:', error);
      setNftPassport(null);
    } finally {
      setLoadingPassport(false);
    }
  };

  // loadPendingRewards and handleClaimRewards removed - now handled by ClaimTokensButton

  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <User className="w-20 h-20 text-white/30 mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Please Sign In</h2>
          <p className="text-white/60">Connect your wallet or sign in to view your profile</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'tokens', label: 'Token History', icon: Coins },
    { id: 'nfts', label: 'NFT History', icon: Sparkles },
    { id: 'achievements', label: 'Achievements', icon: Award },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
        <p className="text-white/60">View your stats, transactions, and achievements</p>
      </motion.div>

      {/* Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6 mb-6"
      >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {userData?.username || user?.username || 'Traveler'}
              </h3>
              <p className="text-white/60 text-sm">
                Level {userData?.level || user?.level || 1}
              </p>
            </div>
          </div>

          {/* Wallet Address */}
          {address && (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/60 text-xs mb-1">Wallet Address</p>
                <a
                  href={`https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-mono"
                >
                  {address.slice(0, 6)}...{address.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Token Balance */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs mb-1">TPX Balance</p>
              {loadingBalance ? (
                <p className="text-white font-bold">Loading...</p>
              ) : (
                <p className="text-white font-bold text-lg">
                  {tokenBalance !== null ? formatTokenAmount(tokenBalance) : '0'} TPX
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Token Management */}
        {isWalletConnected && address && user?.id && (
          <div className="mt-6 space-y-3">
            {/* Add TPX to MetaMask button */}
            <div className="flex justify-center p-3 rounded-xl bg-white/5 border border-white/10">
              <AddTPXToMetaMask address={address} />
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-2xl font-bold text-white">{userData?.total_xp || user?.total_xp || 0}</span>
            </div>
            <p className="text-white/60 text-xs">Total XP</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="text-2xl font-bold text-white">{userData?.quests_completed || user?.quests_completed || 0}</span>
            </div>
            <p className="text-white/60 text-xs">Quests Completed</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-cyan-400" />
              <span className="text-2xl font-bold text-white">
                {formatTokenAmount(
                  typeof (userData?.total_tokens_earned || user?.total_tokens_earned) === 'string'
                    ? parseFloat(userData?.total_tokens_earned || user?.total_tokens_earned || '0') || 0
                    : (userData?.total_tokens_earned || user?.total_tokens_earned || 0)
                )}
              </span>
            </div>
            <p className="text-white/60 text-xs">Tokens Earned</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-green-400" />
              <span className="text-2xl font-bold text-white">
                {Array.isArray(userData?.countries_visited) ? userData.countries_visited.length : (nftPassport?.countries_visited?.length || 0)}
              </span>
            </div>
            <p className="text-white/60 text-xs">Countries Visited</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-sm sm:text-base ${
                isActive
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* NFT Passport Card */}
            {isWalletConnected && address && (
              <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  NFT Passport
                </h3>
                {loadingPassport ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
                  </div>
                ) : nftPassport ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                      <div>
                        <p className="text-white/60 text-sm mb-1">Status</p>
                        <p className="text-green-400 font-semibold">Minted</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm mb-1">Token ID</p>
                        <p className="text-white font-semibold">#{nftPassport.token_id}</p>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm mb-1">Tier</p>
                        <p className="text-white font-semibold capitalize">{nftPassport.tier || 'bronze'}</p>
                      </div>
                      {nftPassport.tx_hash && (
                        <div>
                          <p className="text-white/60 text-sm mb-1">Transaction</p>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${nftPassport.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-2xl font-bold text-white">{nftPassport.quests_completed || 0}</p>
                        <p className="text-white/60 text-xs mt-1">Quests</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-2xl font-bold text-white">{nftPassport.total_xp || 0}</p>
                        <p className="text-white/60 text-xs mt-1">Total XP</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/5">
                        <p className="text-2xl font-bold text-white">{nftPassport.countries_visited?.length || 0}</p>
                        <p className="text-white/60 text-xs mt-1">Countries</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60 text-sm">No NFT Passport minted yet</p>
                    <p className="text-white/40 text-xs mt-2">Mint your NFT Passport from the Dashboard</p>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <p className="text-white/60 text-sm">
                Your recent quests, transactions, and achievements will appear here
              </p>
            </div>
          </div>
        )}

        {activeTab === 'tokens' && (
          <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <TokenTransactionHistory />
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <NFTTransactionHistory />
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6">
            <AchievementHistory />
          </div>
        )}
      </motion.div>
    </div>
  );
};

