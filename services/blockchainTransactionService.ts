import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { sepolia } from 'viem/chains';

const TPX_CONTRACT_ADDRESS = import.meta.env.VITE_TPX_CONTRACT_ADDRESS as `0x${string}`;
const NFT_PASSPORT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS as `0x${string}`;
const ACHIEVEMENT_NFT_CONTRACT_ADDRESS = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS as `0x${string}`;

// Multiple RPC providers for fallback
const RPC_PROVIDERS = [
  'https://ethereum-sepolia.publicnode.com',
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia'
];

// Get primary RPC URL from env or use default
const ETH_SEPOLIA_RPC_URL = import.meta.env.VITE_ETH_SEPOLIA_RPC_URL || 
                            import.meta.env.ETH_SEPOLIA_RPC_URL || 
                            RPC_PROVIDERS[0];

// ERC-20 Transfer event ABI
const ERC20_TRANSFER_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ERC-721 Transfer event ABI
const ERC721_TRANSFER_ABI = [
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;

// Cache for transactions (in-memory)
const transactionCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Create public client with fallback RPC providers
 */
function createPublicClientWithFallback() {
  for (const rpcUrl of RPC_PROVIDERS) {
    try {
      return createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, {
          timeout: 15000,
          fetchOptions: {
            signal: AbortSignal.timeout(15000),
          },
        }),
      });
    } catch (error) {
      console.warn(`[blockchainTransactionService] Failed to create client with ${rpcUrl}:`, error);
      continue;
    }
  }
  throw new Error('Failed to create public client with any RPC provider');
}

/**
 * Get TPX token transactions from blockchain (Transfer events)
 */
export async function getBlockchainTokenTransactions(
  walletAddress: string,
  limit: number = 100
): Promise<Array<{
  txHash: string;
  from: string;
  to: string;
  amount: number;
  blockNumber: bigint;
  timestamp?: number;
  contractAddress: string;
}>> {
  if (!walletAddress || !TPX_CONTRACT_ADDRESS) {
    console.warn('[blockchainTransactionService] Missing wallet address or TPX contract address');
    return [];
  }

  const cacheKey = `tpx_${walletAddress.toLowerCase()}_${limit}`;
  const cached = transactionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[blockchainTransactionService] Returning cached TPX transactions');
    return cached.data;
  }

  try {
    const client = createPublicClientWithFallback();
    const address = walletAddress.toLowerCase() as Address;

    // Get current block number
    const currentBlock = await client.getBlockNumber();
    const MAX_BLOCK_RANGE = 45000; // Keep under 50000 limit
    // Try to get more history - up to 200k blocks (about 1 month on Sepolia)
    const MAX_HISTORY_BLOCKS = 200000;
    let fromBlock = currentBlock > BigInt(MAX_HISTORY_BLOCKS) 
      ? currentBlock - BigInt(MAX_HISTORY_BLOCKS)
      : 0n;

    console.log('[blockchainTransactionService] Fetching TPX transfers for:', address);
    const totalBlocks = Number(currentBlock - fromBlock);
    console.log(`[blockchainTransactionService] Block range: ${fromBlock} to ${currentBlock} (${totalBlocks} blocks, will split into chunks of ${MAX_BLOCK_RANGE})`);

    // Get Transfer events where 'to' is the wallet address
    // Split into smaller ranges if needed
    let allTransferLogs: any[] = [];
    let currentFromBlock = fromBlock;
    const toBlock = currentBlock;

    while (currentFromBlock < toBlock) {
      const currentToBlock = currentFromBlock + BigInt(MAX_BLOCK_RANGE) > toBlock 
        ? toBlock 
        : currentFromBlock + BigInt(MAX_BLOCK_RANGE);

      try {
        const transferLogs = await client.getLogs({
          address: TPX_CONTRACT_ADDRESS,
          event: ERC20_TRANSFER_ABI[0],
          args: {
            to: address,
          },
          fromBlock: currentFromBlock,
          toBlock: currentToBlock,
        });

        allTransferLogs = allTransferLogs.concat(transferLogs);
        console.log(`[blockchainTransactionService] Found ${transferLogs.length} transfers in range ${currentFromBlock}-${currentToBlock}`);
        
        currentFromBlock = currentToBlock + 1n;
      } catch (error: any) {
        if (error.message?.includes('exceed maximum block range')) {
          // If still too large, try smaller range
          const smallerRange = Math.floor(MAX_BLOCK_RANGE / 2);
          const currentToBlock = currentFromBlock + BigInt(smallerRange) > toBlock 
            ? toBlock 
            : currentFromBlock + BigInt(smallerRange);
          
          const transferLogs = await client.getLogs({
            address: TPX_CONTRACT_ADDRESS,
            event: ERC20_TRANSFER_ABI[0],
            args: {
              to: address,
            },
            fromBlock: currentFromBlock,
            toBlock: currentToBlock,
          });

          allTransferLogs = allTransferLogs.concat(transferLogs);
          currentFromBlock = currentToBlock + 1n;
        } else {
          throw error;
        }
      }
    }

    const transferLogs = allTransferLogs;

    console.log(`[blockchainTransactionService] Found ${transferLogs.length} total TPX transfer events`);

    // Process logs and get transaction details
    const transactions = await Promise.all(
      transferLogs.slice(0, limit).map(async (log) => {
        try {
          const tx = await client.getTransaction({ hash: log.transactionHash });
          const block = await client.getBlock({ blockNumber: log.blockNumber });

          return {
            txHash: log.transactionHash,
            from: (log.args.from || '').toLowerCase(),
            to: (log.args.to || '').toLowerCase(),
            amount: parseFloat(formatUnits(log.args.value || 0n, 18)),
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp),
            contractAddress: TPX_CONTRACT_ADDRESS,
          };
        } catch (error) {
          console.warn('[blockchainTransactionService] Error processing TPX transfer log:', error);
          return null;
        }
      })
    );

    const validTransactions = transactions.filter((tx): tx is NonNullable<typeof tx> => tx !== null);
    
    // Sort by block number (newest first)
    validTransactions.sort((a, b) => Number(b.blockNumber - a.blockNumber));

    // Cache results
    transactionCache.set(cacheKey, {
      data: validTransactions,
      timestamp: Date.now(),
    });

    return validTransactions;
  } catch (error) {
    console.error('[blockchainTransactionService] Error fetching TPX transactions:', error);
    return [];
  }
}

/**
 * Get NFT transactions from blockchain (Transfer events)
 */
export async function getBlockchainNFTTransactions(
  walletAddress: string,
  limit: number = 100
): Promise<Array<{
  txHash: string;
  from: string;
  to: string;
  tokenId: number;
  blockNumber: bigint;
  timestamp?: number;
  contractAddress: string;
}>> {
  if (!walletAddress) {
    console.warn('[blockchainTransactionService] Missing wallet address');
    return [];
  }
  
  // List of NFT contracts to check
  const nftContracts: string[] = [];
  if (NFT_PASSPORT_CONTRACT_ADDRESS) {
    nftContracts.push(NFT_PASSPORT_CONTRACT_ADDRESS);
  }
  if (ACHIEVEMENT_NFT_CONTRACT_ADDRESS) {
    nftContracts.push(ACHIEVEMENT_NFT_CONTRACT_ADDRESS);
  }
  
  if (nftContracts.length === 0) {
    console.warn('[blockchainTransactionService] No NFT contract addresses configured');
    return [];
  }
  
  console.log('[blockchainTransactionService] Checking NFT contracts:', nftContracts);

  const cacheKey = `nft_${walletAddress.toLowerCase()}_${limit}`;
  const cached = transactionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[blockchainTransactionService] Returning cached NFT transactions:', cached.data.length);
    return cached.data;
  }
  
  // Clear old cache to force fresh fetch
  console.log('[blockchainTransactionService] Cache expired or not found, fetching fresh data');

  try {
    const client = createPublicClientWithFallback();
    const address = walletAddress.toLowerCase() as Address;

    // Get current block number
    const currentBlock = await client.getBlockNumber();
    const MAX_BLOCK_RANGE = 45000; // Keep under 50000 limit
    // Try to get more history - up to 200k blocks (about 1 month on Sepolia)
    const MAX_HISTORY_BLOCKS = 200000;
    let fromBlock = currentBlock > BigInt(MAX_HISTORY_BLOCKS) 
      ? currentBlock - BigInt(MAX_HISTORY_BLOCKS)
      : 0n;

    console.log('[blockchainTransactionService] Fetching NFT transfers for:', address);
    const totalBlocks = Number(currentBlock - fromBlock);
    console.log(`[blockchainTransactionService] Block range: ${fromBlock} to ${currentBlock} (${totalBlocks} blocks, will split into chunks of ${MAX_BLOCK_RANGE})`);

    // Get Transfer events where 'to' is the wallet address from ALL NFT contracts
    // Split into smaller ranges if needed
    let allTransferLogs: any[] = [];
    const toBlock = currentBlock;
    
    // Check each NFT contract
    for (const contractAddress of nftContracts) {
      console.log(`[blockchainTransactionService] Checking contract: ${contractAddress}`);
      let contractFromBlock = fromBlock;
      
      while (contractFromBlock < toBlock) {
        const currentToBlock = contractFromBlock + BigInt(MAX_BLOCK_RANGE) > toBlock 
          ? toBlock 
          : contractFromBlock + BigInt(MAX_BLOCK_RANGE);

        try {
          const transferLogs = await client.getLogs({
            address: contractAddress as Address,
            event: ERC721_TRANSFER_ABI[0],
            args: {
              to: address,
            },
            fromBlock: contractFromBlock,
            toBlock: currentToBlock,
          });

          allTransferLogs = allTransferLogs.concat(transferLogs);
          console.log(`[blockchainTransactionService] Found ${transferLogs.length} NFT transfers from ${contractAddress} in range ${contractFromBlock}-${currentToBlock}`);
          
          contractFromBlock = currentToBlock + 1n;
        } catch (error: any) {
          if (error.message?.includes('exceed maximum block range')) {
            // If still too large, try smaller range
            const smallerRange = Math.floor(MAX_BLOCK_RANGE / 2);
            const currentToBlock = contractFromBlock + BigInt(smallerRange) > toBlock 
              ? toBlock 
              : contractFromBlock + BigInt(smallerRange);
            
            const transferLogs = await client.getLogs({
              address: contractAddress as Address,
              event: ERC721_TRANSFER_ABI[0],
              args: {
                to: address,
              },
              fromBlock: contractFromBlock,
              toBlock: currentToBlock,
            });

            allTransferLogs = allTransferLogs.concat(transferLogs);
            contractFromBlock = currentToBlock + 1n;
          } else {
            console.warn(`[blockchainTransactionService] Error fetching logs for ${contractAddress}:`, error);
            // Continue with next contract
            break;
          }
        }
      }
    }

    const transferLogs = allTransferLogs;

    console.log(`[blockchainTransactionService] Found ${transferLogs.length} total NFT transfer events`);

    // Process logs and get transaction details
    const transactions = await Promise.all(
      transferLogs.slice(0, limit).map(async (log) => {
        try {
          const block = await client.getBlock({ blockNumber: log.blockNumber });

          return {
            txHash: log.transactionHash,
            from: (log.args.from || '').toLowerCase(),
            to: (log.args.to || '').toLowerCase(),
            tokenId: Number(log.args.tokenId || 0n),
            blockNumber: log.blockNumber,
            timestamp: Number(block.timestamp),
            contractAddress: log.address.toLowerCase(), // Use actual contract address from log
          };
        } catch (error) {
          console.warn('[blockchainTransactionService] Error processing NFT transfer log:', error);
          return null;
        }
      })
    );

    const validTransactions = transactions.filter((tx): tx is NonNullable<typeof tx> => tx !== null);
    
    // Sort by block number (newest first)
    validTransactions.sort((a, b) => Number(b.blockNumber - a.blockNumber));

    // Cache results
    transactionCache.set(cacheKey, {
      data: validTransactions,
      timestamp: Date.now(),
    });

    return validTransactions;
  } catch (error: any) {
    console.error('[blockchainTransactionService] ❌ Error fetching NFT transactions:', error);
    console.error('[blockchainTransactionService] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    // Return empty array but don't cache the error
    return [];
  }
}

/**
 * Clear transaction cache
 */
export function clearTransactionCache() {
  transactionCache.clear();
  console.log('[blockchainTransactionService] Cache cleared');
}

