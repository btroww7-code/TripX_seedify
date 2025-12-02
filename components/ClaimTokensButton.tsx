import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { getPendingClaims, claimTokens, formatTokenAmount } from '../services/tokenService';
import { clearTPXBalanceCache } from '../services/web3Service';

interface ClaimTokensButtonProps {
  onClaimSuccess?: () => void;
  className?: string;
}

export const ClaimTokensButton: React.FC<ClaimTokensButtonProps> = ({
  onClaimSuccess,
  className = ''
}) => {
  const { user: walletUser, address } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;

  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  
  // Track claimed status to prevent showing button after claim
  const hasClaimedRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  // Load pending claims - with debounce to prevent rapid calls
  const loadPendingClaims = useCallback(async () => {
    if (!user?.id) {
      setPending(null);
      setLoading(false);
      return;
    }

    // Debounce: don't reload if we just loaded
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 2000) {
      console.log('[ClaimTokensButton] Debouncing load - too soon');
      return;
    }
    lastLoadTimeRef.current = now;

    // If we just claimed, don't show button
    if (hasClaimedRef.current) {
      console.log('[ClaimTokensButton] Already claimed in this session - keeping hidden');
      setPending(null);
      setLoading(false);
      return;
    }

    try {
      console.log('[ClaimTokensButton] Loading pending claims...');
      const data = await getPendingClaims(user.id);
      
      if (data && data.total_amount > 0 && data.quest_rewards?.length > 0) {
        console.log('[ClaimTokensButton] ✅ Valid pending claims:', data.total_amount, 'TPX');
        setPending(data);
      } else {
        console.log('[ClaimTokensButton] No pending claims available');
        setPending(null);
      }
    } catch (err) {
      console.error('[ClaimTokensButton] Error loading pending claims:', err);
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load on mount and when user changes
  useEffect(() => {
    hasClaimedRef.current = false; // Reset on user change
    setLoading(true);
    loadPendingClaims();
  }, [user?.id, loadPendingClaims]);

  // Listen for claim success events from other components
  useEffect(() => {
    const handleClaimComplete = () => {
      console.log('[ClaimTokensButton] Received claimComplete event - hiding button');
      hasClaimedRef.current = true;
      setPending(null);
    };

    window.addEventListener('claimComplete', handleClaimComplete);
    return () => window.removeEventListener('claimComplete', handleClaimComplete);
  }, []);

  const handleClaim = async () => {
    if (!user || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!pending || pending.total_amount <= 0) {
      toast.error('No tokens available to claim');
      return;
    }

    if (claiming) {
      return; // Prevent double-click
    }

    const claimAmount = pending.total_amount;
    
    setClaiming(true);
    
    // Show loading toast
    const loadingToast = toast.loading('Claiming TPX tokens...', {
      description: `Processing ${formatTokenAmount(claimAmount)} TPX`
    });

    try {
      const result = await claimTokens(user.id, address);

      if (result.success) {
        // IMMEDIATELY hide the button - mark as claimed
        hasClaimedRef.current = true;
        setPending(null);
        
        // Clear TPX balance cache to force refresh
        clearTPXBalanceCache();

        // Dismiss loading toast and show success
        toast.dismiss(loadingToast);
        toast.success('TPX Tokens Claimed! 🎉', {
          description: `Successfully claimed ${formatTokenAmount(result.amount || claimAmount)} TPX`,
          duration: 6000,
        });

        // Broadcast event to other components
        window.dispatchEvent(new CustomEvent('claimComplete', {
          detail: { amount: result.amount || claimAmount, txHash: result.txHash }
        }));

        // Trigger parent callback
        onClaimSuccess?.();

        // Try to add TPX to MetaMask (optional)
        await tryAddTPXToMetaMask(address);
        
      } else {
        toast.dismiss(loadingToast);
        toast.error('Failed to claim tokens', {
          description: result.error || 'Please try again',
        });
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error('Claim failed', {
        description: err.message || 'An unexpected error occurred',
      });
    } finally {
      setClaiming(false);
    }
  };

  // Try to add TPX token to MetaMask wallet
  const tryAddTPXToMetaMask = async (walletAddress: string) => {
    const tpxContractAddress = import.meta.env.VITE_TPX_CONTRACT_ADDRESS;
    
    if (!window.ethereum || !tpxContractAddress) return;
    
    const storageKey = `tpx_added_to_metamask_${walletAddress.toLowerCase()}`;
    if (localStorage.getItem(storageKey)) return;

    try {
      // Switch to Sepolia if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Testnet',
              nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        }
      }

      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tpxContractAddress,
            symbol: 'TPX',
            decimals: 18,
            image: `${window.location.origin}/tpx-logo.png`
          },
        },
      });
      
      localStorage.setItem(storageKey, 'true');
    } catch (error: any) {
      // User rejected or error - don't mark as added if rejected
      if (error.code !== 4001) {
        localStorage.setItem(storageKey, 'true');
      }
    }
  };

  // Don't render anything while loading
  if (loading) {
    return null;
  }

  // Don't render if no user
  if (!user) {
    return null;
  }

  // Don't render if no pending claims
  if (!pending || pending.total_amount <= 0 || !pending.quest_rewards?.length) {
    return null;
  }

  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative overflow-hidden rounded-2xl p-6 backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20"
      >
        <motion.div
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-purple-400/5"
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center relative">
                <Coins className="w-7 h-7 text-cyan-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/30"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Tokens Ready!</h3>
                <p className="text-white/60 text-sm">
                  {pending.quest_rewards?.length || 0} quest reward{pending.quest_rewards?.length !== 1 ? 's' : ''} earned
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {formatTokenAmount(pending.total_amount)}
              </div>
              <div className="text-white/40 text-sm">TPX Tokens</div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: claiming ? 1 : 1.02, y: claiming ? 0 : -2 }}
            whileTap={{ scale: claiming ? 1 : 0.98 }}
            onClick={handleClaim}
            disabled={claiming}
            className="w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.5)',
            }}
          >
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            />

            <div className="relative z-10 flex items-center justify-center gap-2">
              {claiming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Claiming Tokens...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Claim {formatTokenAmount(pending.total_amount)} TPX</span>
                </>
              )}
            </div>
          </motion.button>

          <p className="text-white/40 text-xs text-center mt-3">
            Claiming sends tokens to your connected wallet on Sepolia
          </p>
        </div>
      </motion.div>
    </div>
  );
};
