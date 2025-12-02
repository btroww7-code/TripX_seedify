/**
 * Etherscan Monitor Service
 * Service for monitoring NFT and token transactions on Etherscan/Sepolia
 * Updated to use Etherscan API V2
 */

const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY || '';
// Etherscan API V2 - requires chainid parameter
const SEPOLIA_CHAIN_ID = '11155111';
const ETHERSCAN_BASE_URL = `https://api.etherscan.io/v2/api?chainid=${SEPOLIA_CHAIN_ID}`;
const ETHERSCAN_EXPLORER_URL = 'https://sepolia.etherscan.io';

// TPX Token contract address (using correct variable name)
const TPX_TOKEN_ADDRESS = import.meta.env.VITE_TPX_CONTRACT_ADDRESS || '';
const NFT_PASSPORT_CONTRACT = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS || '';
const ACHIEVEMENT_NFT_CONTRACT = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS || '';

export interface TransactionMonitorResult {
  found: boolean;
  transactionHash?: string;
  blockNumber?: number;
  tokenId?: number;
  value?: string;
  from?: string;
  to?: string;
  contractAddress?: string;
  timestamp?: number;
}

/**
 * Get the current block number on Sepolia
 */
export async function getCurrentBlockNumber(): Promise<number> {
  try {
    const url = `${ETHERSCAN_BASE_URL}&module=proxy&action=eth_blockNumber&apikey=${ETHERSCAN_API_KEY}`;
    console.log('[etherscanMonitor] Getting block number from:', url.replace(ETHERSCAN_API_KEY, '***'));
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('[etherscanMonitor] Block number response:', data);
    if (data.result) {
      const blockNum = parseInt(data.result, 16);
      console.log('[etherscanMonitor] Current block:', blockNum);
      return blockNum;
    }
    return 0;
  } catch (error) {
    console.error('[etherscanMonitor] Error getting current block number:', error);
    return 0;
  }
}

/**
 * Get Etherscan URL for viewing NFT transactions for an address
 */
export function getEtherscanNFTTxUrl(address: string): string {
  return `${ETHERSCAN_EXPLORER_URL}/address/${address}#tokentxnsErc721`;
}

/**
 * Get Etherscan URL for viewing token (ERC20) transactions for an address
 */
export function getEtherscanTokenTxUrl(address: string): string {
  return `${ETHERSCAN_EXPLORER_URL}/address/${address}#tokentxns`;
}

/**
 * Get Etherscan URL for viewing a specific transaction
 */
export function getEtherscanTxUrl(txHash: string): string {
  return `${ETHERSCAN_EXPLORER_URL}/tx/${txHash}`;
}

/**
 * Get Etherscan URL for viewing an NFT token
 */
export function getEtherscanTokenUrl(contractAddress: string, tokenId: number): string {
  return `${ETHERSCAN_EXPLORER_URL}/nft/${contractAddress}/${tokenId}`;
}

/**
 * Monitor for NFT transaction on Etherscan
 * Polls Etherscan API to find NFT transfer to specified address
 */
export async function monitorNFTTransaction(
  walletAddress: string,
  onFound: (result: TransactionMonitorResult) => void,
  onProgress?: (attempts: number) => void,
  contractAddress?: string,
  maxAttempts: number = 30,
  startBlock?: number
): Promise<TransactionMonitorResult> {
  console.log('[etherscanMonitor] Starting NFT transaction monitoring for:', walletAddress);
  console.log('[etherscanMonitor] Contract filter:', contractAddress);
  console.log('[etherscanMonitor] Start block:', startBlock);
  
  let attempts = 0;
  const pollInterval = 2000; // 2 seconds
  
  return new Promise((resolve) => {
    const checkTransaction = async () => {
      attempts++;
      console.log(`[etherscanMonitor] Check attempt ${attempts}/${maxAttempts}`);
      
      if (onProgress) {
        onProgress(attempts);
      }
      
      try {
        // Query Etherscan for ERC721 token transfers to this address
        let url = `${ETHERSCAN_BASE_URL}&module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=10&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        
        if (startBlock) {
          url += `&startblock=${startBlock}`;
        }
        
        console.log('[etherscanMonitor] Fetching from:', url.replace(ETHERSCAN_API_KEY, '***'));
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('[etherscanMonitor] API Response:', {
          status: data.status,
          message: data.message,
          resultCount: data.result?.length || 0
        });
        
        if (data.status === '1' && data.result && data.result.length > 0) {
          console.log('[etherscanMonitor] Found', data.result.length, 'NFT transactions');
          console.log('[etherscanMonitor] First transaction:', data.result[0]);
          
          // Find matching transaction
          for (const tx of data.result) {
            console.log('[etherscanMonitor] Checking tx:', {
              hash: tx.hash?.substring(0, 10),
              contract: tx.contractAddress?.substring(0, 10),
              to: tx.to?.substring(0, 10),
              from: tx.from?.substring(0, 10),
              tokenID: tx.tokenID
            });
            
            // Check if it matches our contract (if specified)
            if (contractAddress && tx.contractAddress.toLowerCase() !== contractAddress.toLowerCase()) {
              console.log('[etherscanMonitor] ❌ Contract mismatch');
              continue;
            }
            
            // Check if it's a transfer TO our wallet
            if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
              const result: TransactionMonitorResult = {
                found: true,
                transactionHash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                tokenId: parseInt(tx.tokenID),
                from: tx.from,
                to: tx.to,
                contractAddress: tx.contractAddress,
                timestamp: parseInt(tx.timeStamp)
              };
              
              console.log('[etherscanMonitor] ✅ NFT transaction found:', result);
              onFound(result);
              resolve(result);
              return;
            } else {
              console.log('[etherscanMonitor] ❌ Recipient mismatch:', tx.to, 'vs', walletAddress);
            }
          }
          console.log('[etherscanMonitor] ⚠️ No matching transaction in results');
        } else {
          console.log('[etherscanMonitor] No transactions found or API error');
        }
        
        // Not found yet, continue polling if we have attempts left
        if (attempts < maxAttempts) {
          setTimeout(checkTransaction, pollInterval);
        } else {
          console.log('[etherscanMonitor] ⏱️ Max attempts reached, transaction not found');
          resolve({ found: false });
        }
      } catch (error) {
        console.error('[etherscanMonitor] Error checking transaction:', error);
        
        // Continue polling on error if we have attempts left
        if (attempts < maxAttempts) {
          setTimeout(checkTransaction, pollInterval);
        } else {
          resolve({ found: false });
        }
      }
    };
    
    // Start polling
    checkTransaction();
  });
}

/**
 * Check if a specific transaction is confirmed on Etherscan
 */
export async function checkTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  blockNumber?: number;
  status?: string;
}> {
  try {
    const url = `${ETHERSCAN_BASE_URL}&module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      return {
        confirmed: data.result.status === '1',
        status: data.result.status === '1' ? 'success' : 'failed'
      };
    }
    
    return { confirmed: false };
  } catch (error) {
    console.error('[etherscanMonitor] Error checking transaction status:', error);
    return { confirmed: false };
  }
}

/**
 * Get recent NFT transactions for an address
 */
export async function getRecentNFTTransactions(
  walletAddress: string,
  contractAddress?: string,
  limit: number = 10
): Promise<TransactionMonitorResult[]> {
  try {
    let url = `${ETHERSCAN_BASE_URL}&module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=${limit}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      return data.result
        .filter((tx: any) => {
          if (!contractAddress) return true;
          return tx.contractAddress.toLowerCase() === contractAddress.toLowerCase();
        })
        .map((tx: any) => ({
          found: true,
          transactionHash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          tokenId: parseInt(tx.tokenID),
          from: tx.from,
          to: tx.to,
          contractAddress: tx.contractAddress,
          timestamp: parseInt(tx.timeStamp)
        }));
    }
    
    return [];
  } catch (error) {
    console.error('[etherscanMonitor] Error getting recent NFT transactions:', error);
    return [];
  }
}

/**
 * Monitor for TPX token transaction on Etherscan
 * Polls Etherscan API to find ERC20 token transfer to specified address
 */
export async function monitorTPXTransaction(
  walletAddress: string,
  onFound: (result: TransactionMonitorResult) => void,
  onProgress?: (attempts: number) => void,
  maxAttempts: number = 30,
  startBlock?: number
): Promise<TransactionMonitorResult> {
  console.log('[etherscanMonitor] Starting TPX transaction monitoring for:', walletAddress);
  console.log('[etherscanMonitor] Start block:', startBlock);
  
  let attempts = 0;
  const pollInterval = 2000; // 2 seconds
  
  return new Promise((resolve) => {
    const checkTransaction = async () => {
      attempts++;
      console.log(`[etherscanMonitor] TPX Check attempt ${attempts}/${maxAttempts}`);
      
      if (onProgress) {
        onProgress(attempts);
      }
      
      try {
        // Query Etherscan for ERC20 token transfers to this address
        let url = `${ETHERSCAN_BASE_URL}&module=account&action=tokentx&address=${walletAddress}&page=1&offset=10&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        
        if (startBlock) {
          url += `&startblock=${startBlock}`;
        }
        
        console.log('[etherscanMonitor] TPX Fetching from:', url.replace(ETHERSCAN_API_KEY, '***'));
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('[etherscanMonitor] TPX API Response:', {
          status: data.status,
          message: data.message,
          resultCount: data.result?.length || 0
        });
        
        if (data.status === '1' && data.result && data.result.length > 0) {
          console.log('[etherscanMonitor] Found', data.result.length, 'token transactions');
          console.log('[etherscanMonitor] First transaction:', data.result[0]);
          
          // Find matching transaction (TPX token)
          for (const tx of data.result) {
            console.log('[etherscanMonitor] Checking TPX tx:', {
              hash: tx.hash?.substring(0, 10),
              contract: tx.contractAddress?.substring(0, 10),
              to: tx.to?.substring(0, 10),
              from: tx.from?.substring(0, 10),
              value: tx.value,
              tokenSymbol: tx.tokenSymbol
            });
            
            // Check if it matches TPX token contract (if specified)
            if (TPX_TOKEN_ADDRESS && tx.contractAddress.toLowerCase() !== TPX_TOKEN_ADDRESS.toLowerCase()) {
              console.log('[etherscanMonitor] ❌ TPX Contract mismatch');
              continue;
            }
            
            // Check if it's a transfer TO our wallet
            if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
              const result: TransactionMonitorResult = {
                found: true,
                transactionHash: tx.hash,
                blockNumber: parseInt(tx.blockNumber),
                value: tx.value,
                from: tx.from,
                to: tx.to,
                contractAddress: tx.contractAddress,
                timestamp: parseInt(tx.timeStamp)
              };
              
              console.log('[etherscanMonitor] ✅ TPX transaction found:', result);
              onFound(result);
              resolve(result);
              return;
            } else {
              console.log('[etherscanMonitor] ❌ TPX Recipient mismatch:', tx.to, 'vs', walletAddress);
            }
          }
          console.log('[etherscanMonitor] ⚠️ No matching TPX transaction in results');
        } else {
          console.log('[etherscanMonitor] No TPX transactions found or API error');
        }
        
        // Not found yet, continue polling if we have attempts left
        if (attempts < maxAttempts) {
          setTimeout(checkTransaction, pollInterval);
        } else {
          console.log('[etherscanMonitor] ⏱️ Max attempts reached, TPX transaction not found');
          resolve({ found: false });
        }
      } catch (error) {
        console.error('[etherscanMonitor] Error checking TPX transaction:', error);
        
        // Continue polling on error if we have attempts left
        if (attempts < maxAttempts) {
          setTimeout(checkTransaction, pollInterval);
        } else {
          resolve({ found: false });
        }
      }
    };
    
    // Start polling
    checkTransaction();
  });
}

/**
 * Get recent token (ERC20) transactions for an address
 */
export async function getRecentTokenTransactions(
  walletAddress: string,
  contractAddress?: string,
  limit: number = 10
): Promise<TransactionMonitorResult[]> {
  try {
    let url = `${ETHERSCAN_BASE_URL}&module=account&action=tokentx&address=${walletAddress}&page=1&offset=${limit}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === '1' && data.result) {
      return data.result
        .filter((tx: any) => {
          if (!contractAddress) return true;
          return tx.contractAddress.toLowerCase() === contractAddress.toLowerCase();
        })
        .map((tx: any) => ({
          found: true,
          transactionHash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          value: tx.value,
          from: tx.from,
          to: tx.to,
          contractAddress: tx.contractAddress,
          timestamp: parseInt(tx.timeStamp)
        }));
    }
    
    return [];
  } catch (error) {
    console.error('[etherscanMonitor] Error getting recent token transactions:', error);
    return [];
  }
}

/**
 * Verify a transaction exists and is confirmed on the blockchain
 * This is useful for double-checking minted NFTs or claimed tokens
 */
export async function verifyTransactionOnChain(txHash: string): Promise<{
  verified: boolean;
  blockNumber?: number;
  confirmations?: number;
  timestamp?: number;
}> {
  try {
    // Get transaction receipt
    const receiptUrl = `${ETHERSCAN_BASE_URL}&module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${ETHERSCAN_API_KEY}`;
    const receiptResponse = await fetch(receiptUrl);
    const receiptData = await receiptResponse.json();
    
    if (!receiptData.result) {
      return { verified: false };
    }
    
    const receipt = receiptData.result;
    const blockNumber = parseInt(receipt.blockNumber, 16);
    
    // Get current block for confirmations
    const currentBlock = await getCurrentBlockNumber();
    const confirmations = currentBlock - blockNumber;
    
    return {
      verified: receipt.status === '0x1',
      blockNumber,
      confirmations: confirmations > 0 ? confirmations : 0,
    };
  } catch (error) {
    console.error('[etherscanMonitor] Error verifying transaction:', error);
    return { verified: false };
  }
}

/**
 * Sync NFT transaction from blockchain to database
 * Call this after monitoring confirms a transaction
 */
export async function syncNFTTransactionToDatabase(
  userId: string,
  txResult: TransactionMonitorResult,
  nftType: 'passport' | 'achievement' | 'quest_reward',
  questId?: string
): Promise<boolean> {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Check if transaction already exists
    const { data: existingTx } = await supabase
      .from('nft_transactions')
      .select('id')
      .eq('tx_hash', txResult.transactionHash)
      .maybeSingle();
    
    if (existingTx) {
      console.log('[etherscanMonitor] Transaction already in database:', txResult.transactionHash);
      return true;
    }
    
    // Insert new transaction
    const { error } = await supabase
      .from('nft_transactions')
      .insert({
        user_id: userId,
        quest_id: questId || null,
        nft_type: nftType,
        token_id: txResult.tokenId,
        tx_hash: txResult.transactionHash,
        contract_address: txResult.contractAddress,
        from_address: txResult.from,
        to_address: txResult.to,
        status: 'confirmed',
        block_number: txResult.blockNumber,
        blockchain_confirmed_at: txResult.timestamp 
          ? new Date(txResult.timestamp * 1000).toISOString() 
          : new Date().toISOString(),
      });
    
    if (error) {
      console.error('[etherscanMonitor] Error saving NFT transaction to database:', error);
      return false;
    }
    
    console.log('[etherscanMonitor] ✅ NFT transaction saved to database');
    return true;
  } catch (error) {
    console.error('[etherscanMonitor] Error syncing NFT transaction:', error);
    return false;
  }
}

/**
 * Sync token transaction from blockchain to database
 */
export async function syncTokenTransactionToDatabase(
  userId: string,
  txResult: TransactionMonitorResult,
  transactionType: 'claim' | 'reward' | 'transfer' | 'burn',
  amount: number
): Promise<boolean> {
  try {
    const { supabase } = await import('../lib/supabase');
    
    // Check if transaction already exists
    const { data: existingTx } = await supabase
      .from('token_transactions')
      .select('id')
      .eq('tx_hash', txResult.transactionHash)
      .maybeSingle();
    
    if (existingTx) {
      console.log('[etherscanMonitor] Token transaction already in database:', txResult.transactionHash);
      return true;
    }
    
    // Insert new transaction
    const { error } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        transaction_type: transactionType,
        amount: amount,
        tx_hash: txResult.transactionHash,
        contract_address: txResult.contractAddress || TPX_TOKEN_ADDRESS,
        from_address: txResult.from,
        to_address: txResult.to,
        status: 'confirmed',
        block_number: txResult.blockNumber,
        blockchain_confirmed_at: txResult.timestamp 
          ? new Date(txResult.timestamp * 1000).toISOString() 
          : new Date().toISOString(),
      });
    
    if (error) {
      console.error('[etherscanMonitor] Error saving token transaction to database:', error);
      return false;
    }
    
    console.log('[etherscanMonitor] ✅ Token transaction saved to database');
    return true;
  } catch (error) {
    console.error('[etherscanMonitor] Error syncing token transaction:', error);
    return false;
  }
}
