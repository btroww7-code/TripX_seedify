import { createPublicClient, createWalletClient, http, formatUnits, parseUnits, type Address, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { supabase } from '../lib/supabase';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

const TPX_CONTRACT_ADDRESS = import.meta.env.VITE_TPX_CONTRACT_ADDRESS as `0x${string}`;
const NFT_PASSPORT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS as `0x${string}`;
const ACHIEVEMENT_NFT_CONTRACT_ADDRESS = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS as `0x${string}`;
const ADMIN_PRIVATE_KEY = import.meta.env.VITE_ADMIN_WALLET_PRIVATE_KEY as `0x${string}`;

// ERC-20 ABI for TPX Token
const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ name: '_value', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    type: 'function',
  },
] as const;

// ERC-721 ABI for NFT Passport
const ERC721_ABI = [
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const;

// NFT Passport Contract ABI
const NFT_PASSPORT_ABI = [
  ...ERC721_ABI,
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'metadataURI', type: 'string' },
      { name: 'tier', type: 'string' },
    ],
    name: 'mint',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'metadataURI', type: 'string' },
      { name: 'tier', type: 'string' },
    ],
    name: 'updateMetadata',
    outputs: [],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTier',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
] as const;

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

// Cache for TPX balances (in-memory)
const balanceCache = new Map<string, { balance: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Create public client with timeout and explicit RPC URL
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(ETH_SEPOLIA_RPC_URL, {
    timeout: 15000, // 15 second timeout (increased)
    fetchOptions: {
      signal: AbortSignal.timeout(15000),
    },
  }),
});

// Create wallet client for admin operations
function getWalletClient() {
  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('Admin wallet private key not configured');
  }
  const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
  const ETH_SEPOLIA_RPC_URL = import.meta.env.VITE_ETH_SEPOLIA_RPC_URL || 
                              import.meta.env.ETH_SEPOLIA_RPC_URL || 
                              'https://ethereum-sepolia.publicnode.com';
  return createWalletClient({
    account,
    chain: sepolia,
    transport: http(ETH_SEPOLIA_RPC_URL),
  });
}

/**
 * Get TPX balance from Ethereum Sepolia with multiple RPC fallback and caching
 */
export async function getTPXBalance(walletAddress: string): Promise<number> {
  if (!walletAddress) {
    return 0;
  }

  if (!TPX_CONTRACT_ADDRESS) {
    console.warn('[TPX Balance] Contract address not configured');
    return 0;
  }

  // Check cache first
  const cacheKey = `${walletAddress}_${TPX_CONTRACT_ADDRESS}`;
  const cached = balanceCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[TPX Balance] Returning cached balance:', cached.balance);
    return cached.balance;
  }

  // Try each RPC provider
  for (let i = 0; i < RPC_PROVIDERS.length; i++) {
    const rpcUrl = RPC_PROVIDERS[i];
    console.log(`[TPX Balance] Trying RPC ${i + 1}/${RPC_PROVIDERS.length}: ${rpcUrl}`);
    
    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, {
          timeout: 15000,
          fetchOptions: {
            signal: AbortSignal.timeout(15000)
          }
        })
      });

      // Check if contract exists
      const code = await client.getBytecode({ address: TPX_CONTRACT_ADDRESS });
      if (!code || code === '0x') {
        console.warn(`[TPX Balance] Contract not deployed at ${TPX_CONTRACT_ADDRESS}`);
        return 0;
      }

      // Get balance
      const balance = await client.readContract({
        address: TPX_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`]
      } as any);

      const balanceFloat = parseFloat(formatUnits(balance, 18));
      
      // Cache successful result
      balanceCache.set(cacheKey, {
        balance: balanceFloat,
        timestamp: Date.now()
      });
      
      console.log(`[TPX Balance] Success! Balance: ${balanceFloat} TPX`);
      return balanceFloat;
      
    } catch (error: any) {
      console.warn(`[TPX Balance] RPC ${rpcUrl} failed:`, error.message);
      
      // If last RPC, return 0
      if (i === RPC_PROVIDERS.length - 1) {
        console.error('[TPX Balance] All RPCs failed');
        return 0;
      }
      
      // Try next RPC
      continue;
    }
  }

  return 0;
}

/**
 * Clear TPX balance cache (useful after claiming tokens)
 */
export function clearTPXBalanceCache() {
  balanceCache.clear();
  console.log('[TPX Balance] Cache cleared');
}

export async function getContractAddress(): Promise<string | null> {
  return TPX_CONTRACT_ADDRESS || null;
}

/**
 * Claim TPX rewards - transfers tokens from admin wallet to user
 */
export async function claimTPXRewards(
  walletAddress: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!TPX_CONTRACT_ADDRESS) {
    return { success: false, error: 'TPX contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    const walletClient = getWalletClient();
    const amountWei = parseUnits(amount.toString(), 18);

    const hash = await walletClient.writeContract({
      address: TPX_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [walletAddress as Address, amountWei],
    } as any);

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('Error claiming TPX rewards:', error);
    return { success: false, error: error.message || 'Failed to claim rewards' };
  }
}

/**
 * Burn TPX tokens (for secret quests)
 */
export async function burnTPXTokens(
  walletAddress: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!TPX_CONTRACT_ADDRESS) {
    return { success: false, error: 'TPX contract not deployed' };
  }

  // Note: This requires the user to sign the transaction
  // In a real implementation, this would be done client-side with user's wallet
  // For now, we'll return an error indicating this needs to be done client-side
  return {
    success: false,
    error: 'Token burning must be done client-side with user wallet signature',
  };
}

/**
 * Mint NFT Passport for a user - ADMIN PAYS GAS, USER RECEIVES NFT
 * Returns immediately after sending transaction (like claimTokens and mintAchievementNFT)
 * Confirmation should be checked via Etherscan API monitoring
 */
export async function mintNFTPassport(
  walletAddress: string,
  metadataURI: string,
  tier: string = 'bronze'
): Promise<{ success: boolean; tokenId?: number; txHash?: string; error?: string }> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return { success: false, error: 'NFT Passport contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    console.log('[mintNFTPassport] Admin minting NFT for user:', walletAddress);
    
    const walletClient = getWalletClient();

    // Admin sends transaction and pays gas
    const hash = await walletClient.writeContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'mint',
      args: [walletAddress as Address, metadataURI, tier],
    } as any);

    console.log('[mintNFTPassport] Transaction sent by admin:', hash);

    // Don't wait for confirmation - return immediately
    // Transaction will be monitored via Etherscan API by the caller
    // Use a random small integer as placeholder tokenId
    const tokenId = Math.floor(Math.random() * 100000) + 1;

    return { success: true, tokenId, txHash: hash };
  } catch (error: any) {
    console.error('[mintNFTPassport] Error:', error);
    return { success: false, error: error.message || 'Failed to mint passport' };
  }
}

/**
 * Update NFT Passport metadata
 */
export async function updateNFTPassportMetadata(
  tokenId: number,
  metadataURI: string,
  tier: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return { success: false, error: 'NFT Passport contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    const walletClient = getWalletClient();

    const hash = await walletClient.writeContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'updateMetadata',
      args: [BigInt(tokenId), metadataURI, tier],
    } as any);

    // Wait for transaction confirmation
    await publicClient.waitForTransactionReceipt({ hash });

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('Error updating NFT Passport metadata:', error);
    return { success: false, error: error.message || 'Failed to update metadata' };
  }
}

/**
 * Get NFT Passport token ID for a user
 * Verifies ownership using ownerOf to ensure token really belongs to this address
 */
export async function getNFTPassportTokenId(walletAddress: string): Promise<number | null> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return null;
  }

  try {
    // First check balanceOf - if 0, user doesn't have passport
    const balance = await publicClient.readContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    } as any);

    const balanceNumber = Number(balance);
    if (balanceNumber === 0) {
      return null;
    }

    // Get tokenId from mapping
    const tokenId = await publicClient.readContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'getTokenId',
      args: [walletAddress as Address],
    } as any);

    const tokenIdNumber = Number(tokenId);
    if (tokenIdNumber === 0) {
      return null;
    }

    // CRITICAL: Verify ownership using ownerOf to ensure token really belongs to this address
    try {
      const ownerAddress = await publicClient.readContract({
        address: NFT_PASSPORT_CONTRACT_ADDRESS,
        abi: NFT_PASSPORT_ABI,
        functionName: 'ownerOf',
        args: [tokenIdNumber],
      } as any);

      const ownerLower = (ownerAddress as string).toLowerCase();
      const walletLower = walletAddress.toLowerCase();

      if (ownerLower !== walletLower) {
        console.warn('[getNFTPassportTokenId] Token ownership mismatch:', {
          tokenId: tokenIdNumber,
          owner: ownerLower,
          wallet: walletLower
        });
        return null; // Don't return tokenId if ownership doesn't match
      }

      return tokenIdNumber;
    } catch (ownerError) {
      console.warn('[getNFTPassportTokenId] Could not verify ownership:', ownerError);
      // If we can't verify ownership, don't return tokenId
      return null;
    }
  } catch (error) {
    console.error('Error getting NFT Passport token ID:', error);
    return null;
  }
}

/**
 * Get NFT owner by token ID
 */
export async function getNFTOwner(tokenId: number): Promise<string | null> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return null;
  }

  try {
    const owner = await publicClient.readContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    } as any);

    return owner ? (owner as string).toLowerCase() : null;
  } catch (error) {
    console.warn('[getNFTOwner] Could not get owner for token', tokenId, ':', error);
    return null;
  }
}

/**
 * Get NFT Passport tier
 */
export async function getNFTPassportTier(tokenId: number): Promise<string | null> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return null;
  }

  try {
    const tier = await publicClient.readContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: NFT_PASSPORT_ABI,
      functionName: 'getTier',
      args: [BigInt(tokenId)],
    } as any);

    return tier as string;
  } catch (error) {
    console.error('Error getting NFT Passport tier:', error);
    return null;
  }
}

/**
 * Get NFT Passport balance for a wallet with retry logic
 */
export async function getNFTPassportBalance(walletAddress: string): Promise<number> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS || !walletAddress) {
    return 0;
  }

  // Try multiple RPC providers
  for (let i = 0; i < RPC_PROVIDERS.length; i++) {
    try {
      console.log(`[NFT Balance] Trying RPC ${i + 1}/${RPC_PROVIDERS.length}: ${RPC_PROVIDERS[i]}`);
      
      const client = createPublicClient({
        chain: sepolia,
        transport: http(RPC_PROVIDERS[i], {
          timeout: 10000,
          fetchOptions: {
            signal: AbortSignal.timeout(10000),
          },
        }),
      });

      const balance = await client.readContract({
        address: NFT_PASSPORT_CONTRACT_ADDRESS,
        abi: NFT_PASSPORT_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      } as any);

      console.log(`[NFT Balance] Success! Balance: ${balance}`);
      return Number(balance);
    } catch (error) {
      console.warn(`[NFT Balance] RPC ${i + 1} failed:`, error instanceof Error ? error.message : error);
      if (i === RPC_PROVIDERS.length - 1) {
        console.error('[NFT Balance] All RPCs failed');
        return 0;
      }
    }
  }
  
  return 0;
}

/**
 * Claim tokens - transfer TPX from admin to user
 */
export async function claimTokens(
  walletAddress: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; receipt?: any; error?: string }> {
  if (!TPX_CONTRACT_ADDRESS) {
    return { success: false, error: 'TPX contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    console.log('[claimTokens] Transferring', amount, 'TPX to', walletAddress);
    const walletClient = getWalletClient();
    const amountWei = parseUnits(amount.toString(), 18);

    const hash = await walletClient.writeContract({
      address: TPX_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [walletAddress as Address, amountWei],
    } as any);

    console.log('[claimTokens] Transaction sent:', hash);

    // Clear cache immediately - don't wait for confirmation
    clearTPXBalanceCache();

    // Return success immediately after tx is sent - monitoring will handle confirmation
    // This prevents timeout errors when blockchain is slow
    console.log('[claimTokens] ✅ Transaction submitted successfully');
    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('[claimTokens] Error:', error);
    return { success: false, error: error.message || 'Failed to claim tokens' };
  }
}

/**
 * Burn tokens from user wallet
 */
export async function burnTokens(
  walletAddress: string,
  amount: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!TPX_CONTRACT_ADDRESS) {
    return { success: false, error: 'TPX contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    console.log('[burnTokens] Burning', amount, 'TPX from', walletAddress);
    const walletClient = getWalletClient();
    const amountWei = parseUnits(amount.toString(), 18);

    const hash = await walletClient.writeContract({
      address: TPX_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'burn',
      args: [amountWei],
    } as any);

    console.log('[burnTokens] Transaction sent:', hash);

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    console.log('[burnTokens] Transaction confirmed');

    // Clear cache
    clearTPXBalanceCache();

    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error('[burnTokens] Error:', error);
    return { success: false, error: error.message || 'Failed to burn tokens' };
  }
}

/**
 * Update NFT Passport
 */
export async function updateNFTPassport(
  tokenId: number,
  metadataURI: string,
  tier: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  return updateNFTPassportMetadata(tokenId, metadataURI, tier);
}

/**
 * Mint Achievement NFT
 * Returns immediately after sending transaction (like claimTokens)
 * Confirmation should be checked via Etherscan API or monitoring
 */
export async function mintAchievementNFT(
  walletAddress: string,
  metadataURI: string,
  questId: string
): Promise<{ success: boolean; tokenId?: number; txHash?: string; error?: string }> {
  const ACHIEVEMENT_CONTRACT_ADDRESS = import.meta.env.VITE_ACHIEVEMENT_NFT_CONTRACT_ADDRESS as `0x${string}`;
  
  if (!ACHIEVEMENT_CONTRACT_ADDRESS) {
    return { success: false, error: 'Achievement NFT contract not deployed' };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return { success: false, error: 'Admin wallet not configured' };
  }

  try {
    console.log('[mintAchievementNFT] Minting for', walletAddress);
    const walletClient = getWalletClient();

    // Simplified mint function for achievement contract (includes questId)
    const hash = await walletClient.writeContract({
      address: ACHIEVEMENT_CONTRACT_ADDRESS,
      abi: [
        {
          constant: false,
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'metadataURI', type: 'string' },
            { name: 'questId', type: 'string' },
          ],
          name: 'mint',
          outputs: [{ name: '', type: 'uint256' }],
          type: 'function',
        },
      ] as const,
      functionName: 'mint',
      args: [walletAddress as Address, metadataURI, questId],
    } as any);

    console.log('[mintAchievementNFT] Transaction sent:', hash);

    // Don't wait for confirmation - return immediately like claimTokens
    // Transaction will be monitored via Etherscan API by the caller
    // Use a random small integer as placeholder tokenId (will be updated when confirmed)
    const tokenId = Math.floor(Math.random() * 100000) + 1;

    return { success: true, tokenId, txHash: hash };
  } catch (error: any) {
    console.error('[mintAchievementNFT] Error:', error);
    return { success: false, error: error.message || 'Failed to mint achievement' };
  }
}

/**
 * Check if user has Achievement NFT on blockchain
 * Returns balance of Achievement NFTs for the wallet
 * Uses multiple RPC fallback for reliability (same as TPX balance)
 */
export async function getAchievementNFTBalance(walletAddress: string): Promise<number> {
  if (!walletAddress) {
    return 0;
  }

  if (!ACHIEVEMENT_NFT_CONTRACT_ADDRESS) {
    console.warn('[getAchievementNFTBalance] Achievement NFT contract address not configured');
    return 0;
  }

  console.log('[getAchievementNFTBalance] Checking balance for:', walletAddress);

  // Try each RPC provider (same approach as TPX balance)
  for (let i = 0; i < RPC_PROVIDERS.length; i++) {
    const rpcUrl = RPC_PROVIDERS[i];
    console.log(`[getAchievementNFTBalance] Trying RPC ${i + 1}/${RPC_PROVIDERS.length}: ${rpcUrl}`);
    
    try {
      const client = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl, {
          timeout: 10000,
          fetchOptions: {
            signal: AbortSignal.timeout(10000)
          }
        })
      });

      const balance = await client.readContract({
        address: ACHIEVEMENT_NFT_CONTRACT_ADDRESS,
        abi: ERC721_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
      });

      const balanceNum = Number(balance);
      console.log(`[getAchievementNFTBalance] Success! Balance: ${balanceNum}`);
      return balanceNum;
      
    } catch (error: any) {
      console.warn(`[getAchievementNFTBalance] RPC ${rpcUrl} failed:`, error.message);
      
      // If last RPC, return 0
      if (i === RPC_PROVIDERS.length - 1) {
        console.error('[getAchievementNFTBalance] All RPCs failed');
        return 0;
      }
      
      // Try next RPC
      continue;
    }
  }

  return 0;
}

/**
 * Mint Achievement (wrapper for compatibility)
 */
export async function mintAchievement(
  userId: string,
  questId: string,
  walletAddress: string
): Promise<{ success: boolean; txHash?: string; tokenId?: number; error?: string }> {
  // This function is now handled by web3ApiClient.mintAchievementAPI
  // Keep for backward compatibility
  return { 
    success: false, 
    error: 'Please use web3ApiClient.mintAchievementAPI instead' 
  };
}

