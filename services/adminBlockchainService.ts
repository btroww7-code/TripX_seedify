import { createPublicClient, http, Address } from 'viem';
import { sepolia } from 'viem/chains';

const TPX_CONTRACT_ADDRESS = import.meta.env.VITE_TPX_CONTRACT_ADDRESS as Address;
const NFT_PASSPORT_CONTRACT_ADDRESS = import.meta.env.VITE_NFT_PASSPORT_CONTRACT_ADDRESS as Address;

const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    type: 'function',
  },
] as const;

const ERC721_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
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

const NFT_PASSPORT_ABI = [
  ...ERC721_ABI,
  {
    constant: true,
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTier',
    outputs: [{ name: '', type: 'string' }],
    type: 'function',
  },
] as const;

const RPC_PROVIDERS = [
  'https://ethereum-sepolia.publicnode.com',
  'https://rpc.sepolia.org',
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://1rpc.io/sepolia'
];

const ETH_SEPOLIA_RPC_URL = import.meta.env.VITE_ETH_SEPOLIA_RPC_URL || RPC_PROVIDERS[0];

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(ETH_SEPOLIA_RPC_URL, {
    timeout: 15000,
  }),
});

export interface BlockchainStats {
  tpx: {
    totalSupply: string;
    decimals: number;
    contractAddress: string;
    holders: number;
  };
  nftPassport: {
    totalSupply: number;
    contractAddress: string;
    tierDistribution: {
      bronze: number;
      silver: number;
      gold: number;
      platinum: number;
    };
  };
  network: {
    chainId: number;
    name: string;
    rpcUrl: string;
  };
}

/**
 * Get TPX token total supply
 */
export async function getTPXTotalSupply(): Promise<string> {
  if (!TPX_CONTRACT_ADDRESS) {
    throw new Error('TPX contract address not configured');
  }

  try {
    const totalSupply = await publicClient.readContract({
      address: TPX_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'totalSupply',
    } as any);

    const decimals = await publicClient.readContract({
      address: TPX_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'decimals',
    } as any);

    const supply = BigInt(totalSupply as any);
    const decimalsNum = Number(decimals);
    const divisor = BigInt(10 ** decimalsNum);
    
    return (Number(supply) / Number(divisor)).toFixed(2);
  } catch (error) {
    console.error('Error fetching TPX total supply:', error);
    throw error;
  }
}

/**
 * Get NFT Passport total supply
 */
export async function getNFTPassportTotalSupply(): Promise<number> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    throw new Error('NFT Passport contract address not configured');
  }

  try {
    const totalSupply = await publicClient.readContract({
      address: NFT_PASSPORT_CONTRACT_ADDRESS,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    } as any);

    return Number(totalSupply);
  } catch (error) {
    console.error('Error fetching NFT Passport total supply:', error);
    return 0;
  }
}

/**
 * Get NFT Passport tier distribution
 */
export async function getNFTPassportTierDistribution(): Promise<{
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}> {
  if (!NFT_PASSPORT_CONTRACT_ADDRESS) {
    return { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  }

  try {
    const totalSupply = await getNFTPassportTotalSupply();
    const distribution = { bronze: 0, silver: 0, gold: 0, platinum: 0 };

    // Sample up to 100 tokens to estimate distribution
    const sampleSize = Math.min(totalSupply, 100);
    
    for (let i = 1; i <= sampleSize; i++) {
      try {
        const tier = await publicClient.readContract({
          address: NFT_PASSPORT_CONTRACT_ADDRESS,
          abi: NFT_PASSPORT_ABI,
          functionName: 'getTier',
          args: [BigInt(i)],
        } as any);

        const tierStr = (tier as string).toLowerCase();
        if (tierStr.includes('bronze')) distribution.bronze++;
        else if (tierStr.includes('silver')) distribution.silver++;
        else if (tierStr.includes('gold')) distribution.gold++;
        else if (tierStr.includes('platinum')) distribution.platinum++;
      } catch (e) {
        // Token might not exist, skip
        continue;
      }
    }

    // Extrapolate if we sampled less than total
    if (sampleSize < totalSupply && sampleSize > 0) {
      const multiplier = totalSupply / sampleSize;
      distribution.bronze = Math.round(distribution.bronze * multiplier);
      distribution.silver = Math.round(distribution.silver * multiplier);
      distribution.gold = Math.round(distribution.gold * multiplier);
      distribution.platinum = Math.round(distribution.platinum * multiplier);
    }

    return distribution;
  } catch (error) {
    console.error('Error fetching NFT Passport tier distribution:', error);
    return { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  }
}

/**
 * Get blockchain statistics
 */
export async function getBlockchainStats(): Promise<BlockchainStats> {
  try {
    const [tpxSupply, tpxDecimals, nftTotalSupply, nftTierDistribution] = await Promise.all([
      getTPXTotalSupply(),
      publicClient.readContract({
        address: TPX_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'decimals',
      } as any).catch(() => 18),
      getNFTPassportTotalSupply(),
      getNFTPassportTierDistribution(),
    ]);

    return {
      tpx: {
        totalSupply: tpxSupply,
        decimals: Number(tpxDecimals) || 18,
        contractAddress: TPX_CONTRACT_ADDRESS || '',
        holders: 0, // Would need to query events to get accurate count
      },
      nftPassport: {
        totalSupply: nftTotalSupply,
        contractAddress: NFT_PASSPORT_CONTRACT_ADDRESS || '',
        tierDistribution: nftTierDistribution,
      },
      network: {
        chainId: sepolia.id,
        name: sepolia.name,
        rpcUrl: ETH_SEPOLIA_RPC_URL,
      },
    };
  } catch (error) {
    console.error('Error fetching blockchain stats:', error);
    throw error;
  }
}

/**
 * Get transaction history for a user (from database, not blockchain)
 * This would typically be called from adminService
 */
export async function getUserTransactionHistory(userId: string): Promise<any[]> {
  // This should be handled by adminService which queries the database
  // This is just a placeholder for blockchain-specific queries if needed
  return [];
}

