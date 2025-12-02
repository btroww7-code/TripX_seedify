import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface TransactionMonitorToastProps {
  type: 'tpx' | 'nft';
  walletAddress: string;
  attempts: number;
  maxAttempts: number;
  status: 'monitoring' | 'success' | 'timeout';
  transactionHash?: string;
  onViewOnEtherscan?: () => void;
}

export const TransactionMonitorToast: React.FC<TransactionMonitorToastProps> = ({
  type,
  walletAddress,
  attempts,
  maxAttempts,
  status,
  transactionHash,
  onViewOnEtherscan
}) => {
  const progressPercent = (attempts / maxAttempts) * 100;
  
  const getStatusMessage = () => {
    if (status === 'success') {
      return type === 'tpx' ? '✅ TPX tokens received!' : '✅ NFT minted successfully!';
    }
    if (status === 'timeout') {
      return '⏱️ Transaction not found on explorer yet';
    }
    return type === 'tpx' 
      ? `🔍 Checking Sepolia explorer for TPX tokens... (${attempts}/${maxAttempts})`
      : `🔍 Checking Sepolia explorer for NFT... (${attempts}/${maxAttempts})`;
  };

  const getSubMessage = () => {
    if (status === 'monitoring') {
      return 'Checking every 2 seconds...';
    }
    if (status === 'timeout') {
      return 'Transaction may still be pending. Check Etherscan manually.';
    }
    return 'Transaction confirmed on blockchain!';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border backdrop-blur-xl p-4 min-w-[320px] ${
        status === 'success'
          ? 'bg-green-500/20 border-green-500/30'
          : status === 'timeout'
          ? 'bg-yellow-500/20 border-yellow-500/30'
          : 'bg-cyan-500/20 border-cyan-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {status === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : status === 'timeout' ? (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          ) : (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-1">
            {getStatusMessage()}
          </p>
          <p className="text-xs text-white/60 mb-2">
            {getSubMessage()}
          </p>
          
          {/* Progress bar for monitoring */}
          {status === 'monitoring' && (
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
          
          {/* Transaction hash link */}
          {transactionHash && status === 'success' && (
            <button
              onClick={onViewOnEtherscan}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>View on Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
          
          {/* Manual check link for timeout */}
          {status === 'timeout' && (
            <button
              onClick={onViewOnEtherscan}
              className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <span>Check manually on Etherscan</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
