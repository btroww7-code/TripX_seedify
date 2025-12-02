import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Check } from 'lucide-react';

interface AddTPXToMetaMaskProps {
  address?: string;
  className?: string;
}

export const AddTPXToMetaMask: React.FC<AddTPXToMetaMaskProps> = ({ address, className = '' }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToken = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install MetaMask to add TPX token.');
      return;
    }

    setIsAdding(true);
    try {
      // TPX Contract Address on Ethereum Sepolia
      const tpxContractAddress = '0x6A19B0E01cB227B9fcc7eD95b8f13D2894d63Ffd';
      
      console.log('[AddTPXToMetaMask] Adding TPX token to MetaMask...');
      console.log('[AddTPXToMetaMask] Contract Address:', tpxContractAddress);
      console.log('[AddTPXToMetaMask] Network: Ethereum Sepolia Testnet (Chain ID: 11155111)');
      
      // First, ensure user is on Sepolia network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 11155111 in hex = Sepolia
        });
        console.log('[AddTPXToMetaMask] Switched to Sepolia network');
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
            console.log('[AddTPXToMetaMask] Added Sepolia network');
          } catch (addError) {
            console.error('[AddTPXToMetaMask] Error adding Sepolia network:', addError);
            throw new Error('Please add Sepolia testnet to MetaMask manually');
          }
        } else {
          console.log('[AddTPXToMetaMask] User declined network switch or already on Sepolia');
        }
      }

      // Now add the TPX token with correct parameters
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tpxContractAddress, // Contract address on Sepolia
            symbol: 'TPX', // Token symbol
            decimals: 18, // Token decimals (standard ERC20)
            image: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png', // Token icon
          },
        },
      });

      if (wasAdded) {
        console.log('[AddTPXToMetaMask] ✅ TPX token added successfully to MetaMask!');
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 3000);
      } else {
        console.log('[AddTPXToMetaMask] User declined to add token');
      }
    } catch (error: any) {
      console.error('[AddTPXToMetaMask] Error adding token:', error);
      // Don't show error for user cancellation (code 4001)
      if (error.code !== 4001) {
        alert(`Failed to add TPX token: ${error.message || 'Please ensure you are on Sepolia testnet'}`);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleAddToken}
      disabled={isAdding || isAdded}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {isAdded ? (
        <>
          <Check className="w-4 h-4" />
          Added to MetaMask!
        </>
      ) : isAdding ? (
        <>
          <Wallet className="w-4 h-4 animate-pulse" />
          Adding...
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          Add TPX to MetaMask
        </>
      )}
    </motion.button>
  );
};
