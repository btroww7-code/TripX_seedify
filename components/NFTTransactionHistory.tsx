import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Award,
  Image as ImageIcon
} from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import {
  getNFTTransactions,
  getNFTTypeLabel,
  getNFTTypeColor,
  type NFTTransaction,
} from '../services/nftTransactionService';

export const NFTTransactionHistory: React.FC = () => {
  const { user: walletUser, address } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;

  const [transactions, setTransactions] = useState<NFTTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[NFTTransactionHistory] User changed:', user?.id, 'address:', address);
    
    // CRITICAL: Clear transactions when user changes
    setTransactions([]);
    setLoading(true);
    
    if (user?.id) {
      console.log('[NFTTransactionHistory] Loading NFT transactions for user:', user.id);
      loadTransactions();
    } else {
      console.log('[NFTTransactionHistory] No user - clearing transactions');
      setLoading(false);
    }
  }, [user?.id, address]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Pass wallet address to get blockchain transactions too
      const walletAddr = address || user.wallet_address;
      console.log('[NFTTransactionHistory] Loading transactions for:', {
        userId: user.id,
        walletAddress: walletAddr,
        limit: 50
      });
      
      // Clear cache before fetching to ensure fresh data
      try {
        const { clearTransactionCache } = await import('../services/blockchainTransactionService');
        clearTransactionCache();
        console.log('[NFTTransactionHistory] Cache cleared');
      } catch (cacheError) {
        console.warn('[NFTTransactionHistory] Could not clear cache:', cacheError);
      }
      
      const data = await getNFTTransactions(user.id, 50, walletAddr);
      console.log('[NFTTransactionHistory] ✅ Loaded transactions:', data.length);
      if (data.length > 0) {
        console.log('[NFTTransactionHistory] Transaction details:', data.map(tx => ({
          id: tx.id,
          type: tx.nft_type,
          tokenId: tx.token_id,
          contract: tx.contract_address?.substring(0, 10) + '...',
          txHash: tx.tx_hash?.substring(0, 10) + '...'
        })));
      } else {
        console.warn('[NFTTransactionHistory] ⚠️ No transactions found!');
      }
      
      setTransactions(data);
    } catch (err: any) {
      console.error('[NFTTransactionHistory] ❌ Error loading NFT transactions:', err);
      console.error('[NFTTransactionHistory] Error details:', {
        message: err.message,
        stack: err.stack
      });
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8 text-center">
        <Sparkles className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No NFT Transactions Yet</h3>
        <p className="text-white/60 text-sm">
          Mint NFTs by completing quests with NFT rewards
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">NFT Transaction History</h3>

      <div className="space-y-3">
        {transactions.map((tx, index) => {
          const color = getNFTTypeColor(tx.nft_type);
          const typeLabel = getNFTTypeLabel(tx.nft_type);

          return (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`w-12 h-12 rounded-full bg-${color}-500/20 border border-${color}-500/30 flex items-center justify-center`}
                  >
                    <Sparkles className={`w-6 h-6 text-${color}-400`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{typeLabel}</h4>
                      {getStatusIcon(tx.status)}
                      {tx.token_id && (
                        <span className="text-xs text-white/60">Token #{tx.token_id}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-white/60 flex-wrap">
                      <span>{formatDate(tx.created_at)}</span>
                      {tx.blockchain_confirmed_at && (
                        <>
                          <span>•</span>
                          <span className="text-xs">
                            {new Date(tx.blockchain_confirmed_at).toLocaleTimeString()}
                          </span>
                        </>
                      )}
                      {tx.tx_hash && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="View on Etherscan"
                          >
                            <span className="text-xs font-mono">
                              {tx.tx_hash.slice(0, 6)}...{tx.tx_hash.slice(-4)}
                            </span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                      {address && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.etherscan.io/address/${address}#nfttransfers`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors text-xs"
                            title="View Your NFT Transfers"
                          >
                            Your Wallet
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                      {tx.token_id && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.etherscan.io/nft/${tx.contract_address}/${tx.token_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors text-xs"
                            title="View NFT"
                          >
                            View NFT
                            <ImageIcon className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {tx.metadata && Object.keys(tx.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <details className="text-xs text-white/60">
                    <summary className="cursor-pointer hover:text-white/80 transition-colors">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 rounded bg-black/20 overflow-x-auto">
                      {JSON.stringify(tx.metadata, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {transactions.length >= 50 && (
        <p className="text-center text-white/40 text-sm pt-4">
          Showing latest 50 transactions
        </p>
      )}
    </div>
  );
};

