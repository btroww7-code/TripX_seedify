import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { NFTPassport } from '../../NFTPassport';
import { LevelBadge } from '../../LevelBadge';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { getAllAchievements, getUserAchievements, getUserAchievementProgress, type Achievement, type UserAchievement } from '../../../services/achievementService';
import {
  monitorNFTTransaction,
  getCurrentBlockNumber,
  getEtherscanNFTTxUrl,
  getEtherscanTxUrl,
  type TransactionMonitorResult
} from '../../../services/etherscanMonitor';

interface AchievementWithProgress extends Achievement {
  progress?: number;
  unlocked?: boolean;
  unlocked_at?: string;
  nft_minted?: boolean;
  nft_token_id?: number;
  nft_tx_hash?: string;
}

export const Achievements: React.FC = () => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [achievementsWithProgress, setAchievementsWithProgress] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mintingAchievementId, setMintingAchievementId] = useState<string | null>(null);
  const { address } = useWalletAuth();
  
  // Track minted achievements in this session to prevent double mint
  const mintedInSessionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadAchievements();
  }, [user]);

  const loadAchievements = async () => {
    if (!user) {
      console.log('[Achievements] No user, skipping load');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Achievements] Loading achievements for user:', user.id);
      
      // Load all achievements and user achievements in parallel
      const [allAchievementsData, userAchievementsData] = await Promise.all([
        getAllAchievements(),
        getUserAchievements(user.id)
      ]);

      console.log('[Achievements] All achievements:', allAchievementsData?.length || 0);
      console.log('[Achievements] User achievements:', userAchievementsData?.length || 0);

      setAllAchievements(allAchievementsData || []);
      setUserAchievements(userAchievementsData || []);

      if (!allAchievementsData || allAchievementsData.length === 0) {
        console.warn('[Achievements] No achievements found in database');
        setAchievementsWithProgress([]);
        setLoading(false);
        return;
      }

      // Calculate progress for each achievement
      const achievementsWithProgressData = await Promise.all(
        allAchievementsData.map(async (achievement) => {
          const progress = await getUserAchievementProgress(user.id, achievement.id);
          const userAchievement = userAchievementsData.find(
            (ua) => ua.achievement_id === achievement.id
          );

          return {
            ...achievement,
            progress: progress.current,
            unlocked: !!userAchievement?.unlocked_at,
            unlocked_at: userAchievement?.unlocked_at,
            nft_minted: userAchievement?.nft_minted || false,
            nft_token_id: userAchievement?.nft_token_id,
            nft_tx_hash: userAchievement?.nft_tx_hash
          };
        })
      );

      console.log('[Achievements] Achievements with progress:', achievementsWithProgressData.length);
      setAchievementsWithProgress(achievementsWithProgressData);
    } catch (err) {
      console.error('[Achievements] Error loading achievements:', err);
      console.error('[Achievements] Error details:', err);
      setError('Failed to load achievements. Please try again.');
      setAchievementsWithProgress([]);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (achievement: AchievementWithProgress): number => {
    if (!achievement.requirement_value || achievement.requirement_value === 0) return 0;
    const currentProgress = achievement.progress || 0;
    return Math.min((currentProgress / achievement.requirement_value) * 100, 100);
  };

  const handleMintAchievementBadge = async (achievementId: string) => {
    // Prevent double mint in session
    if (mintedInSessionRef.current.has(achievementId)) {
      console.log('[Achievements] Already minted in this session:', achievementId);
      return;
    }
    
    if (!user?.id || !address) {
      toast.error('Please connect your wallet to mint achievement badge NFT');
      return;
    }

    setMintingAchievementId(achievementId);
    const mintingToast = toast.loading('🎨 Minting achievement badge NFT...');
    
    try {
      // Get current block to start monitoring from
      const startBlock = await getCurrentBlockNumber();
      
      // Use direct Supabase + Web3 (no backend)
      const { mintAchievementAPI } = await import('../../../services/web3ApiClient');
      const result = await mintAchievementAPI(user.id, achievementId, address);

      if (!result.success || !result.data) {
        toast.dismiss(mintingToast);
        toast.error(`Failed to mint achievement badge: ${result.error}`);
        setMintingAchievementId(null);
        return;
      }

      const data = result.data;

      if (data.success) {
        // Mark as minted in session
        mintedInSessionRef.current.add(achievementId);
        
        toast.dismiss(mintingToast);
        
        // Show monitoring toast
        const monitorToast = toast.loading(
          '🔍 Checking Sepolia explorer for NFT...',
          {
            description: 'Monitoring transaction every 2 seconds',
            duration: Infinity
          }
        );
        
        // Start monitoring NFT transaction - use ACHIEVEMENT NFT contract, not Passport!
        const achievementNftContractAddress = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS || '0x110D62545d416d3DFEfA12D0298aBf197CF0e828';
        const monitorResult = await monitorNFTTransaction(
          address,
          (txResult: TransactionMonitorResult) => {
            console.log('[Achievements] ✅ NFT transaction found on explorer!', txResult);
            
            // Dismiss monitoring toast
            toast.dismiss(monitorToast);
            
            // Show success toast
            toast.success('✅ Achievement NFT minted successfully!', {
              description: `Token ID: ${data.tokenId}`,
              duration: 5000,
              action: {
                label: 'View on Etherscan',
                onClick: () => window.open(getEtherscanTxUrl(txResult.transactionHash!), '_blank')
              }
            });
            
            // Auto-add NFT to MetaMask after confirmation
            setTimeout(() => addNFTToMetaMask(data.tokenId, achievementId), 1000);
          },
          (attempts) => {
            // Update toast with progress
            toast.loading(
              `🔍 Checking Sepolia explorer... (${attempts}/100)`,
              {
                id: monitorToast,
                description: 'Monitoring every 2 seconds',
                duration: Infinity
              }
            );
          },
          achievementNftContractAddress,
          100, // 100 attempts = 200 seconds
          startBlock
        );
        
        // If timeout (transaction not found)
        if (!monitorResult.found) {
          toast.dismiss(monitorToast);
          toast.warning('⏱️ NFT mint not confirmed yet', {
            description: 'Transaction may still be pending. Check Etherscan manually.',
            duration: 8000,
            action: {
              label: 'Open Etherscan',
              onClick: () => window.open(getEtherscanNFTTxUrl(address), '_blank')
            }
          });
        }
        
        // Update local state
        setAchievementsWithProgress(prev => prev.map(a => 
          a.id === achievementId 
            ? { ...a, nft_minted: true, nft_token_id: data.tokenId }
            : a
        ));
        
        // Reload page after monitoring completes
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        toast.dismiss(mintingToast);
        toast.error(`Failed to mint NFT: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error minting achievement badge:', error);
      toast.dismiss(mintingToast);
      toast.error(`Error minting NFT: ${error.message || 'Unknown error'}`);
    } finally {
      setMintingAchievementId(null);
    }
  };

  /**
   * Add NFT to MetaMask wallet
   */
  const addNFTToMetaMask = async (tokenId: number, achievementId: string) => {
    if (!window.ethereum || !address) {
      console.log('[Achievements] MetaMask not available');
      return;
    }

    // Use ACHIEVEMENT NFT contract, not Passport!
    const nftContractAddress = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS || '0x110D62545d416d3DFEfA12D0298aBf197CF0e828';
    if (!nftContractAddress) {
      console.error('[Achievements] Achievement NFT contract address not configured');
      return;
    }

    try {
      // Always prompt to add NFT (every time a new one is minted)
      console.log('[Achievements] Prompting user to add NFT to MetaMask...');
      
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC721',
          options: {
            address: nftContractAddress,
            tokenId: tokenId.toString(),
          },
        },
      });

      if (wasAdded) {
        const storageKey = `achievement_badge_nft_added_${address.toLowerCase()}_${achievementId}`;
        localStorage.setItem(storageKey, 'true');
        console.log('[Achievements] ✅ NFT added to MetaMask!');
        
        toast.success('NFT added to MetaMask!', {
          description: `Token ID ${tokenId} is now visible in your wallet`,
          duration: 5000
        });
      }
    } catch (error: any) {
      console.error('[Achievements] Error adding NFT to MetaMask:', error);
      
      // User rejected
      if (error.code === 4001) {
        console.log('[Achievements] User rejected NFT addition');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Achievements</h1>
            <p className="text-slate-400">Unlock badges by completing challenges</p>
          </div>
        </div>
      </motion.div>

      {user && (
        <div className="mb-8">
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
            <LevelBadge level={user.level} totalXP={user.total_xp} showProgress={true} />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="mt-4 text-white/60">Loading achievements...</p>
        </div>
      ) : achievementsWithProgress.length === 0 ? (
        <div className="text-center py-12">
          <Award className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No achievements available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievementsWithProgress.map((achievement, index) => {
            const unlocked = achievement.unlocked || false;
            const progress = getProgress(achievement);
            const currentProgress = achievement.progress || 0;

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300 ${
                  unlocked
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30 shadow-lg shadow-amber-500/10'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div
                  className={`inline-flex p-4 rounded-2xl mb-4 ${
                    unlocked
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : 'bg-white/10 opacity-50 grayscale'
                  }`}
                >
                  <span className="text-3xl">{achievement.icon || '🏆'}</span>
                </div>
                <h3 className={`text-lg font-bold mb-2 ${unlocked ? 'text-white' : 'text-slate-400'}`}>
                  {achievement.title}
                </h3>
                <p className="text-sm text-slate-400 mb-4">{achievement.description}</p>

                {/* Progress Bar */}
                {achievement.requirement_value && achievement.requirement_value > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>
                        {currentProgress} / {achievement.requirement_value}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        unlocked ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-white/20'
                      }`}
                    />
                  </div>
                  </div>
                )}
                {(achievement.reward_tokens > 0 || achievement.reward_xp > 0) && (
                  <div className="flex gap-3 text-xs text-white/60">
                    {achievement.reward_tokens > 0 && (
                      <span>💰 {achievement.reward_tokens} TPX</span>
                    )}
                    {achievement.reward_xp > 0 && (
                      <span>⭐ {achievement.reward_xp} XP</span>
                    )}
                  </div>
                )}

                {unlocked && (
                  <div className="mt-3 space-y-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Unlocked!</span>
                    </motion.div>
                    
                    {achievement.nft_minted ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="w-3 h-3 text-green-400" />
                        <span className="text-green-400">NFT Minted</span>
                        {achievement.nft_tx_hash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${achievement.nft_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ) : address && !mintedInSessionRef.current.has(achievement.id) && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMintAchievementBadge(achievement.id)}
                        disabled={mintingAchievementId === achievement.id}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                      >
                        {mintingAchievementId === achievement.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Minting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            <span>Mint NFT Badge</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
