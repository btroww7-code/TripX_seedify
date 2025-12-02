import { supabase } from '../lib/supabase';

export interface NFTTransaction {
  id: string;
  user_id: string;
  quest_id?: string;
  nft_type: 'achievement' | 'passport' | 'quest_reward';
  token_id?: number;
  contract_address: string;
  tx_hash: string;
  from_address?: string;
  to_address: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata_uri?: string;
  block_number?: number;
  gas_used?: number;
  gas_price?: number;
  blockchain_confirmed_at?: string;
  error_message?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export async function getNFTTransactions(
  userId: string,
  limit: number = 50,
  walletAddress?: string
): Promise<NFTTransaction[]> {
  console.log('[getNFTTransactions] Fetching transactions for user:', userId, 'limit:', limit);
  
  // Get transactions from database
  const { data: dbTransactions, error } = await supabase
    .from('nft_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[getNFTTransactions] Error fetching NFT transactions from database:', error);
    console.error('[getNFTTransactions] Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
  }

  const dbTxList = dbTransactions || [];
  console.log('[getNFTTransactions] Found', dbTxList.length, 'transactions in database');
  
  // Log each transaction for debugging
  if (dbTxList.length > 0) {
    console.log('[getNFTTransactions] Transaction types:', dbTxList.map(tx => tx.nft_type));
    console.log('[getNFTTransactions] Transaction IDs:', dbTxList.map(tx => tx.id));
  }

  // If wallet address is provided, also fetch from blockchain
  if (walletAddress) {
    try {
      const { getBlockchainNFTTransactions } = await import('./blockchainTransactionService');
      const blockchainTxs = await getBlockchainNFTTransactions(walletAddress, limit);

      // Merge and deduplicate transactions
      const txMap = new Map<string, NFTTransaction>();

      // Add database transactions first (they have more metadata)
      for (const tx of dbTxList) {
        if (tx.tx_hash) {
          txMap.set(tx.tx_hash.toLowerCase(), tx);
        }
      }

      // Add blockchain transactions that aren't in database
      for (const btx of blockchainTxs) {
        const txHashLower = btx.txHash.toLowerCase();
        if (!txMap.has(txHashLower)) {
          // Determine NFT type based on contract address
          const contractLower = btx.contractAddress.toLowerCase();
          const passportContract = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS?.toLowerCase();
          const achievementContract = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS?.toLowerCase();
          
          let nftType: 'passport' | 'achievement' | 'quest_reward' = 'achievement';
          if (passportContract && contractLower === passportContract) {
            nftType = 'passport';
          } else if (achievementContract && contractLower === achievementContract) {
            nftType = 'achievement';
          } else {
            // Unknown contract - default to achievement
            nftType = 'achievement';
          }
          
          // Convert blockchain transaction to NFTTransaction format
          const nftTx: NFTTransaction = {
            id: `blockchain_${btx.txHash}`,
            user_id: userId,
            nft_type: nftType,
            token_id: btx.tokenId,
            contract_address: btx.contractAddress,
            tx_hash: btx.txHash,
            from_address: btx.from,
            to_address: btx.to,
            status: 'confirmed',
            block_number: Number(btx.blockNumber),
            blockchain_confirmed_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : undefined,
            metadata: {
              source: 'blockchain',
              timestamp: btx.timestamp,
              contract_address: btx.contractAddress,
            },
            created_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : new Date().toISOString(),
            updated_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : new Date().toISOString(),
          };
          txMap.set(txHashLower, nftTx);
        }
      }

      // Convert map to array and sort by created_at (newest first)
      const allTransactions = Array.from(txMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      console.log('[getNFTTransactions] Total unique transactions after merge:', allTransactions.length);
      console.log('[getNFTTransactions] Returning', Math.min(allTransactions.length, limit), 'transactions');
      
      return allTransactions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching blockchain NFT transactions:', error);
      // Return database transactions if blockchain fetch fails
      return dbTxList;
    }
  }

  return dbTxList;
}

export function getNFTTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    achievement: 'Achievement NFT',
    passport: 'Passport NFT',
    quest_reward: 'Quest Reward NFT',
  };
  return labels[type] || type;
}

export function getNFTTypeColor(type: string): string {
  const colors: Record<string, string> = {
    achievement: 'purple',
    passport: 'cyan',
    quest_reward: 'pink',
  };
  return colors[type] || 'gray';
}

