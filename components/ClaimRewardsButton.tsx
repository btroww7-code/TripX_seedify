import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { claimRewardsAPI, handleApiError } from '../services/web3ApiClient';
import { getClaimableAmount } from '../services/tokenClaimService';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { glassEffects } from '../styles/glassEffects';

interface ClaimRewardsButtonProps {
  className?: string;
  onSuccess?: (amount: number, txHash: string) => void;
}

export const ClaimRewardsButton: React.FC<ClaimRewardsButtonProps> = ({
  className = '',
  onSuccess,
}) => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;

  const [claimableAmount, setClaimableAmount] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch claimable amount
  useEffect(() => {
    console.log('[ClaimRewardsButton] User changed:', user?.id);
    
    // CRITICAL: Clear claimable amount when user changes
    setClaimableAmount(0);
    setLoading(true);
    setIsClaiming(false);
    setShowSuccess(false);
    setShowError(false);
    
    if (user?.id) {
      console.log('[ClaimRewardsButton] Loading claimable amount for user:', user.id);
      fetchClaimableAmount();
    } else {
      console.log('[ClaimRewardsButton] No user - clearing claimable amount');
      setLoading(false);
    }
  }, [user?.id]);

  const fetchClaimableAmount = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const amount = await getClaimableAmount(user.id);
      setClaimableAmount(amount);
    } catch (error) {
      console.error('Error fetching claimable amount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!user?.id || !walletUser?.wallet_address) {
      setMessage('Please connect your wallet to claim rewards');
      setShowError(true);
      return;
    }

    if (claimableAmount <= 0) {
      setMessage('No rewards available to claim');
      setShowError(true);
      return;
    }

    setIsClaiming(true);
    setShowSuccess(false);
    setShowError(false);

    try {
      const result = await claimRewardsAPI(user.id, walletUser.wallet_address);

      if (result.success && result.data) {
        setMessage(
          `Successfully claimed ${result.data.amount} TPX tokens! (Free Testnet - Base Sepolia)`
        );
        setShowSuccess(true);
        setClaimableAmount(0);

        if (onSuccess) {
          onSuccess(result.data.amount, result.data.txHash);
        }

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        const errorMsg = handleApiError(result.error);
        setMessage(errorMsg);
        setShowError(true);
      }
    } catch (error: any) {
      setMessage(error.message || 'Failed to claim rewards');
      setShowError(true);
    } finally {
      setIsClaiming(false);
    }
  };

  // Don't show button if no wallet connected
  if (!walletUser?.wallet_address) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Claim Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClaim}
        disabled={isClaiming || claimableAmount <= 0 || loading}
        className={`relative px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 flex items-center gap-2 ${
          claimableAmount > 0 && !loading
            ? 'bg-gradient-to-r from-yellow-500/90 to-orange-500/90 border border-yellow-400/30 shadow-lg shadow-yellow-500/50 hover:shadow-yellow-500/60 cursor-pointer'
            : 'bg-slate-700/50 border border-slate-600/30 cursor-not-allowed opacity-50'
        }`}
        style={
          claimableAmount > 0 && !loading
            ? {
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }
            : undefined
        }
      >
        {isClaiming ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Claiming...
          </>
        ) : loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Coins className="w-5 h-5" />
            {claimableAmount > 0
              ? `Claim ${claimableAmount.toFixed(2)} TPX (Free Testnet)`
              : 'No Rewards'}
          </>
        )}

        {/* Animated glow effect */}
        {claimableAmount > 0 && !loading && !isClaiming && (
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl blur-xl pointer-events-none"
          />
        )}
      </motion.button>

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 p-4 rounded-xl bg-green-500/20 border border-green-500/30 backdrop-blur-xl"
            style={glassEffects.inlineStyles.glassStrong}
          >
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-medium">{message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {showError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 p-4 rounded-xl bg-red-500/20 border border-red-500/30 backdrop-blur-xl"
            style={glassEffects.inlineStyles.glassStrong}
          >
            <div className="flex items-start gap-2 text-red-400">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{message}</p>
                <button
                  onClick={() => setShowError(false)}
                  className="text-xs text-red-300 hover:text-red-200 mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
