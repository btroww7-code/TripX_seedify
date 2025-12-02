import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  MapPin, 
  TrendingUp, 
  Star, 
  Loader2, 
  CheckCircle,
  XCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { mintPassportAPI, updatePassportAPI, handleApiError } from '../services/web3ApiClient';
import { getNFTPassportTokenId, getNFTPassportTier } from '../services/web3Service';
import { monitorNFTTransaction, getEtherscanNFTTxUrl } from '../services/etherscanMonitor';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { supabase } from '../lib/supabase';
import { glassEffects } from '../styles/glassEffects';
import { AddNFTToWalletModal } from './AddNFTToWalletModal';

interface NFTPassportCardProps {
  className?: string;
}

interface PassportData {
  hasPassport: boolean;
  tokenId?: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  countriesVisited: string[];
  questsCompleted: number;
  totalXP: number;
}

const TIER_COLORS = {
  bronze: 'from-orange-700 to-orange-900',
  silver: 'from-gray-400 to-gray-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-purple-400 to-purple-600',
};

const TIER_REQUIREMENTS = {
  bronze: { level: 1, xp: 0 },
  silver: { level: 15, xp: 2250 },
  gold: { level: 30, xp: 9000 },
  platinum: { level: 50, xp: 25000 },
};

export const NFTPassportCard: React.FC<NFTPassportCardProps> = ({ className = '' }) => {
  const { user: walletUser, address, isConnected: isWalletConnected } = useWalletAuth();
  const { user: emailUser, isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const hookUser = walletUser || emailUser;
  const [localUser, setLocalUser] = useState(hookUser);
  const user = localUser || hookUser; // Use local user if set, otherwise use hook user
  const isLoggedIn = isWalletConnected || isEmailAuthenticated;

  // Sync local user with hook user
  useEffect(() => {
    if (hookUser) {
      setLocalUser(hookUser);
    }
  }, [hookUser]);

  const [passportData, setPassportData] = useState<PassportData>({
    hasPassport: false,
    tier: 'bronze',
    countriesVisited: [],
    questsCompleted: 0,
    totalXP: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  // Removed showSuccess, showError, message states - now using toast
  const [showAddToWalletModal, setShowAddToWalletModal] = useState(false);
  const [mintResult, setMintResult] = useState<{tokenId: number, txHash: string, contractAddress: string} | null>(null);
  
  // Track if passport was minted in this session to prevent double mint
  const hasMintedInSession = useRef(false);

  useEffect(() => {
    console.log('[NFTPassportCard] useEffect - user?.id:', user?.id, 'isWalletConnected:', isWalletConnected, 'address:', address);
    
    if (isWalletConnected && address && user?.id) {
      console.log('[NFTPassportCard] Fetching passport data for user:', user.id);
      // Reset state only when fetching new data
      setLoading(true);
      fetchPassportData();
    } else if (!user?.id && !isWalletConnected) {
      // Only reset when user actually logged out (no user AND not connected)
      console.log('[NFTPassportCard] User logged out - resetting state');
      setPassportData({
        hasPassport: false,
        tier: 'bronze',
        countriesVisited: [],
        questsCompleted: 0,
        totalXP: 0,
      });
      setLoading(false);
    }
  }, [user?.id, address, isWalletConnected]);

  const fetchPassportData = async () => {
    if (!user?.id) {
      console.log('[NFTPassportCard] fetchPassportData - no user.id, returning');
      return;
    }

    try {
      setLoading(true);
      console.log('[NFTPassportCard] fetchPassportData - starting for user:', user.id);

      // Get user data from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !userData) {
        console.error('[NFTPassportCard] Error fetching user data:', error);
        throw new Error('User not found');
      }

      console.log('[NFTPassportCard] User data fetched:', userData);

      // Check if user has NFT Passport in nft_passports table
      const { data: passportRecord, error: passportError } = await supabase
        .from('nft_passports')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('[NFTPassportCard] Passport record from DB:', passportRecord, 'Error:', passportError);

      // If user has passport record in nft_passports table, show passport
      if (passportRecord && !passportError && passportRecord.token_id) {
        console.log('[NFTPassportCard] User HAS NFT Passport in DB - tokenId:', passportRecord.token_id);
        
        setPassportData({
          hasPassport: true,
          tokenId: passportRecord.token_id,
          tier: passportRecord.tier || 'bronze',
          countriesVisited: passportRecord.countries_visited || [],
          questsCompleted: passportRecord.quests_completed || 0,
          totalXP: passportRecord.total_xp || 0,
        });
      } else if (address && isWalletConnected) {
        // If no passport in DB, check blockchain as backup
        try {
          console.log('[NFTPassportCard] No passport in DB, checking blockchain...');
          const { getNFTPassportTokenId } = await import('../services/web3Service');
          const blockchainTokenId = await getNFTPassportTokenId(address);
          
          if (blockchainTokenId && blockchainTokenId > 0) {
            console.log('[NFTPassportCard] Found passport on blockchain, syncing to DB...');
            // Sync to database - update nft_passports if exists, or create new record
            const { error: syncError } = await supabase
              .from('nft_passports')
              .upsert({
                user_id: user.id,
                token_id: blockchainTokenId,
                tier: userData.passport_tier || 'bronze',
                countries_visited: userData.countries_visited || [],
                quests_completed: userData.quests_completed || 0,
                total_xp: userData.total_xp || 0,
              }, {
                onConflict: 'user_id'
              });
            
            if (!syncError) {
              console.log('[NFTPassportCard] ✅ Passport synced from blockchain to DB');
              setPassportData({
                hasPassport: true,
                tokenId: blockchainTokenId,
                tier: userData.passport_tier || 'bronze',
                countriesVisited: userData.countries_visited || [],
                questsCompleted: userData.quests_completed || 0,
                totalXP: userData.total_xp || 0,
              });
            } else {
              console.error('[NFTPassportCard] Failed to sync passport:', syncError);
              // Fall through to show mint button
              setPassportData({
                hasPassport: false,
                tier: userData.passport_tier || 'bronze',
                countriesVisited: userData.countries_visited || [],
                questsCompleted: userData.quests_completed || 0,
                totalXP: userData.total_xp || 0,
              });
            }
          } else {
            // No passport on blockchain either - show mint button
            console.log('[NFTPassportCard] No passport on blockchain - will show MINT button');
            setPassportData({
              hasPassport: false,
              tier: userData.passport_tier || 'bronze',
              countriesVisited: userData.countries_visited || [],
              questsCompleted: userData.quests_completed || 0,
              totalXP: userData.total_xp || 0,
            });
          }
        } catch (blockchainError) {
          console.error('[NFTPassportCard] Error checking blockchain:', blockchainError);
          // On error, show mint button
          setPassportData({
            hasPassport: false,
            tier: userData.passport_tier || 'bronze',
            countriesVisited: userData.countries_visited || [],
            questsCompleted: userData.quests_completed || 0,
            totalXP: userData.total_xp || 0,
          });
        }
      } else {
        // User doesn't have NFT Passport yet - show mint button
        console.log('[NFTPassportCard] User does NOT have NFT Passport - will show MINT button');
        setPassportData({
          hasPassport: false,
          tier: userData.passport_tier || 'bronze',
          countriesVisited: userData.countries_visited || [],
          questsCompleted: userData.quests_completed || 0,
          totalXP: userData.total_xp || 0,
        });
      }
    } catch (error) {
      console.error('[NFTPassportCard] Error fetching passport data:', error);
      // On error, assume user doesn't have passport yet - show mint button
      console.log('[NFTPassportCard] Error occurred - setting hasPassport to false to show mint button');
      setPassportData({
        hasPassport: false,
        tier: 'bronze',
        countriesVisited: [],
        questsCompleted: 0,
        totalXP: 0,
      });
    } finally {
      setLoading(false);
      // Note: passportData.hasPassport will be updated via setPassportData above
      console.log('[NFTPassportCard] fetchPassportData - finished');
    }
  };

  const handleAddToWallet = async () => {
    if (!mintResult || !window.ethereum) return;
    
    try {
      console.log('[NFTPassportCard] Adding NFT to MetaMask...', mintResult);
      
      // Try to add NFT to MetaMask (may not work on all versions)
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: mintResult.contractAddress,
            tokenId: mintResult.tokenId.toString(),
          },
        },
      });
      
      console.log('[NFTPassportCard] ✅ NFT added to MetaMask!');
      setShowAddToWalletModal(false);
    } catch (error: any) {
      console.log('[NFTPassportCard] User rejected or MetaMask does not support ERC721:', error.message);
      // Don't show error - not critical
      setShowAddToWalletModal(false);
    }
  };

  const handleMint = async () => {
    // Prevent double mint in session
    if (hasMintedInSession.current) {
      console.log('[NFTPassportCard] Already minted in this session');
      return;
    }
    
    if (!address) {
      toast.error('Please connect your wallet to mint NFT Passport');
      return;
    }

    // Check if already has passport (double check)
    if (passportData.hasPassport && passportData.tokenId) {
      toast.info('You already have an NFT Passport!');
      return;
    }

    setIsMinting(true);
    const loadingToast = toast.loading('Minting NFT Passport... Sending to blockchain');

    try {
      // Get or create user if not loaded yet
      let userId = user?.id;
      if (!userId) {
        console.log('[NFTPassportCard] User not loaded, creating/getting user...');
        const { getOrCreateUser } = await import('../services/userService');
        const userProfile = await getOrCreateUser(address);
        if (!userProfile) {
          toast.dismiss(loadingToast);
          toast.error('Failed to create user profile. Please try again.');
          setIsMinting(false);
          return;
        }
        userId = userProfile.id;
        setLocalUser(userProfile);
        console.log('[NFTPassportCard] User created/loaded:', userId);
      }

      console.log('[NFTPassportCard] Calling mintPassportAPI with:', { userId, address, tier: passportData.tier });
      
      const result = await mintPassportAPI(
        userId,
        address,
        passportData.tier
      );
      
      console.log('[NFTPassportCard] mintPassportAPI result:', result);

      if (result.success && result.data) {
        console.log('[NFTPassportCard] ✅ Mint API successful! Data:', result.data);
        
        // Mark as minted in session
        hasMintedInSession.current = true;
        
        const nftContractAddress = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS || '0xFc22556bb4ae5740610bE43457d46AdA5200b994';
        const txHash = result.data.txHash;
        
        // Update toast to show monitoring
        toast.dismiss(loadingToast);
        const monitorToastId = toast.loading('🔍 Monitoring Etherscan for NFT Passport transaction...', {
          description: 'Checking every 2 seconds for blockchain confirmation',
          duration: 120000
        });
        
        console.log('[NFTPassportCard] Starting Etherscan monitoring for NFT Passport...');
        
        // Monitor Etherscan for the NFT transaction
        // Signature: monitorNFTTransaction(walletAddress, onFound, onProgress, nftContractAddress, maxAttempts, startBlock)
        monitorNFTTransaction(
          address,
          async (txResult) => {
            // onFound callback - transaction found on Etherscan
            console.log('[NFTPassportCard] ✅ NFT Passport transaction found on Etherscan!', txResult);
            
            toast.dismiss(monitorToastId);
            
            // Get Etherscan link
            const etherscanUrl = getEtherscanNFTTxUrl(txResult.transactionHash || txHash);
            
            // Show success toast with Etherscan link
            toast.success('🎉 NFT Passport minted successfully!', {
              description: (
                <div className="flex flex-col gap-1">
                  <span>Token ID: #{result.data.tokenId}</span>
                  <a 
                    href={etherscanUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View on Etherscan →
                  </a>
                </div>
              ),
              duration: 10000
            });
            
            // Store mint result for Add to Wallet modal
            const finalTokenId = result.data.tokenId;
            setMintResult({
              tokenId: finalTokenId,
              txHash: txResult.transactionHash || txHash,
              contractAddress: nftContractAddress
            });
            
            // Update local state
            setPassportData(prev => ({
              ...prev,
              hasPassport: true,
              tokenId: finalTokenId
            }));
            
            // Auto-add NFT to MetaMask
            if (typeof window !== 'undefined' && window.ethereum && finalTokenId) {
              try {
                console.log('[NFTPassportCard] Adding NFT Passport to MetaMask...');
                const wasAdded = await window.ethereum.request({
                  method: 'wallet_watchAsset',
                  params: {
                    type: 'ERC721',
                    options: {
                      address: nftContractAddress,
                      tokenId: String(finalTokenId),
                    },
                  },
                });
                
                if (wasAdded) {
                  toast.success('NFT Passport added to MetaMask! 🦊');
                }
              } catch (mmError: any) {
                console.log('[NFTPassportCard] MetaMask add NFT error (non-critical):', mmError.message);
                // Show modal as fallback
                setShowAddToWalletModal(true);
              }
            }
            
            // Auto-refresh page after short delay
            toast.info('🔄 Refreshing page in 2 seconds...', { duration: 2000 });
            setTimeout(() => {
              console.log('[NFTPassportCard] Auto-refreshing page after successful mint...');
              window.location.reload();
            }, 2000);
          },
          (attempts) => {
            // Progress callback - update toast
            console.log(`[NFTPassportCard] Monitoring progress: ${attempts}/100`);
          },
          nftContractAddress, // NFT contract address
          100, // maxAttempts (100 * 2s = 200s)
          0 // startBlock
        ).then((monitorResult) => {
          if (!monitorResult.found) {
            toast.dismiss(monitorToastId);
            console.log('[NFTPassportCard] Monitoring timeout - transaction not found on Etherscan');
            toast.warning('Transaction verification timeout', {
              description: 'NFT Passport may still be processing. Check Etherscan manually.',
              duration: 8000
            });
            
            // Still update state and show modal
            setPassportData(prev => ({
              ...prev,
              hasPassport: true,
              tokenId: result.data.tokenId
            }));
            
            if (result.data.tokenId) {
              setMintResult({
                tokenId: result.data.tokenId,
                txHash: txHash,
                contractAddress: nftContractAddress
              });
              setShowAddToWalletModal(true);
            }
            
            setIsMinting(false);
          }
        });
        
      } else {
        // Handle error
        toast.dismiss(loadingToast);
        const errorMsg = result.error || 'Failed to mint NFT Passport';
        console.error('[NFTPassportCard] Mint failed:', errorMsg);
        toast.error(errorMsg);
        setIsMinting(false);
      }
    } catch (error: any) {
      console.error('[NFTPassportCard] Error minting NFT Passport:', error);
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to mint NFT Passport. Please try again.');
      setIsMinting(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user?.id) {
      toast.error('Please login to upgrade your passport');
      return;
    }

    if (!passportData.hasPassport) {
      toast.error('You need to mint your passport first');
      return;
    }

    setIsUpgrading(true);
    const loadingToast = toast.loading('Updating passport metadata...');

    try {
      const result = await updatePassportAPI(user.id);

      toast.dismiss(loadingToast);

      if (result.success && result.data) {
        toast.success('NFT Passport metadata updated successfully!');
        await fetchPassportData();
      } else {
        const errorMsg = handleApiError(result.error);
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || 'Failed to update NFT Passport');
    } finally {
      setIsUpgrading(false);
    }
  };

  const getNextTier = (): string | null => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(passportData.tier);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

  const getProgressToNextTier = (): number => {
    const nextTier = getNextTier();
    if (!nextTier) return 100;

    const currentReq = TIER_REQUIREMENTS[passportData.tier as keyof typeof TIER_REQUIREMENTS].xp;
    const nextReq = TIER_REQUIREMENTS[nextTier as keyof typeof TIER_REQUIREMENTS].xp;
    const progress = ((passportData.totalXP - currentReq) / (nextReq - currentReq)) * 100;

    return Math.min(Math.max(progress, 0), 100);
  };

  // Show for wallet users only (email users can't mint NFT Passport)
  if (!isWalletConnected || !address) {
    return null;
  }
  
  // Always show component if wallet is connected - user data will load
  console.log('[NFTPassportCard] Rendering - isWalletConnected:', isWalletConnected, 'address:', address, 'user:', !!user, 'hasPassport:', passportData.hasPassport, 'loading:', loading);

  // Don't show loader - always show component, data will load in background

  return (
    <div className={`relative ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 backdrop-blur-xl border border-white/10 relative overflow-hidden"
        style={glassEffects.inlineStyles.glassStrong}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${TIER_COLORS[passportData.tier]} opacity-10`} />

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${TIER_COLORS[passportData.tier]} flex items-center justify-center`}>
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white capitalize">
                  {passportData.tier} Passport
                </h3>
                {passportData.hasPassport && passportData.tokenId && (
                  <p className="text-sm text-slate-400">
                    Token ID: #{passportData.tokenId}
                  </p>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              passportData.hasPassport
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
            }`}>
              {passportData.hasPassport ? 'Minted' : 'Not Minted'}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MapPin className="w-4 h-4 text-teal-400" />
                <p className="text-2xl font-bold text-white">
                  {passportData.countriesVisited.length}
                </p>
              </div>
              <p className="text-xs text-slate-400">Countries</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                <p className="text-2xl font-bold text-white">
                  {passportData.questsCompleted}
                </p>
              </div>
              <p className="text-xs text-slate-400">Quests</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-teal-400" />
                <p className="text-2xl font-bold text-white">
                  {passportData.totalXP.toLocaleString()}
                </p>
              </div>
              <p className="text-xs text-slate-400">Total XP</p>
            </div>
          </div>

          {/* Progress to next tier */}
          {getNextTier() && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-300">
                  Progress to{' '}
                  <span className="capitalize font-semibold">
                    {getNextTier()}
                  </span>
                </p>
                <p className="text-sm text-slate-400">
                  {getProgressToNextTier().toFixed(0)}%
                </p>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getProgressToNextTier()}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${TIER_COLORS[getNextTier() as keyof typeof TIER_COLORS]}`}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {!passportData.hasPassport ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMint}
                disabled={isMinting}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-teal-500/90 to-cyan-500/90 border border-teal-400/30 shadow-lg shadow-teal-500/50 hover:shadow-teal-500/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Minting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Mint NFT Passport
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-purple-500/90 to-pink-500/90 border border-purple-400/30 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/60 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpgrading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Update Metadata
                  </>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Success/Error messages now handled by toast notifications */}

      {/* Add to Wallet Modal */}
      {mintResult && (
        <AddNFTToWalletModal
          isOpen={showAddToWalletModal}
          onClose={() => setShowAddToWalletModal(false)}
          onAddToWallet={handleAddToWallet}
          nftType="passport"
          tokenId={mintResult.tokenId}
          contractAddress={mintResult.contractAddress}
          txHash={mintResult.txHash}
        />
      )}
    </div>
  );
};

