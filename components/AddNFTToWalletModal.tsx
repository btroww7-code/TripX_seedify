import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, ExternalLink, CheckCircle2 } from 'lucide-react';

interface AddNFTToWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToWallet: () => void;
  nftType: 'passport' | 'achievement';
  tokenId: number;
  contractAddress: string;
  txHash: string;
  questTitle?: string;
}

export const AddNFTToWalletModal: React.FC<AddNFTToWalletModalProps> = ({
  isOpen,
  onClose,
  onAddToWallet,
  nftType,
  tokenId,
  contractAddress,
  txHash,
  questTitle,
}) => {
  const explorerUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
  const nftExplorerUrl = `https://sepolia.etherscan.io/nft/${contractAddress}/${tokenId}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">NFT Minted!</h2>
                  <p className="text-sm text-white/60">
                    {nftType === 'passport' ? 'Travel Passport' : questTitle || 'Achievement'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* NFT Details */}
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/60 mb-1">Token ID</p>
                  <p className="text-white font-mono">#{tokenId}</p>
                </div>
                <div>
                  <p className="text-white/60 mb-1">Network</p>
                  <p className="text-white">Sepolia</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/60 mb-1">Contract</p>
                  <p className="text-white font-mono text-xs break-all">
                    {contractAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <p className="text-green-400 text-center font-medium">
                ✅ Your NFT has been minted successfully!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Add to MetaMask */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAddToWallet}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300"
              >
                <Wallet className="w-5 h-5" />
                Add NFT to MetaMask
              </motion.button>

              {/* View on Etherscan */}
              <a
                href={nftExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-all duration-300"
                >
                  <ExternalLink className="w-5 h-5" />
                  View on Etherscan
                </motion.button>
              </a>

              {/* Close */}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all duration-300"
              >
                Close
              </button>
            </div>

            {/* Transaction Link */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-1"
              >
                View transaction
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
