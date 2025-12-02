import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { supabase } from '../lib/supabase';

const TPX_CONTRACT_ADDRESS = import.meta.env.VITE_TPX_CONTRACT_ADDRESS as `0x${string}`;
const ADMIN_PRIVATE_KEY = import.meta.env.ADMIN_WALLET_PRIVATE_KEY as `0x${string}`;

// ERC-20 ABI for transfer
const ERC20_ABI = [
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
] as const;

/**
 * Claim TPX rewards for verified quests
 * Transfers tokens from admin wallet to user on Base Sepolia testnet
 */
export async function claimTPXRewards(userId: string, walletAddress: string): Promise<{
  success: boolean;
  amount: number;
  txHash?: string;
  error?: string;
}> {
  if (!TPX_CONTRACT_ADDRESS) {
    return {
      success: false,
      amount: 0,
      error: 'TPX contract not deployed. Please deploy the contract first.',
    };
  }

  if (!ADMIN_PRIVATE_KEY) {
    return {
      success: false,
      amount: 0,
      error: 'Admin wallet not configured.',
    };
  }

  try {
    // Get unclaimed quests for user
    const { data: userQuests, error: questsError } = await supabase
      .from('user_quests')
      .select(`
        *,
        quests(reward_tokens)
      `)
      .eq('user_id', userId)
      .eq('status', 'verified')
      .eq('tokens_claimed', false);

    if (questsError || !userQuests || userQuests.length === 0) {
      return {
        success: false,
        amount: 0,
        error: 'No unclaimed rewards found.',
      };
    }

    // Calculate total reward amount
    const totalAmount = userQuests.reduce((sum, uq) => {
      const quest = uq.quests as any;
      return sum + parseFloat(quest.reward_tokens?.toString() || '0');
    }, 0);

    if (totalAmount <= 0) {
      return {
        success: false,
        amount: 0,
        error: 'No rewards to claim.',
      };
    }

    // Get RPC URL from env or use default Sepolia RPC
    const SEPOLIA_RPC_URL = import.meta.env.VITE_SEPOLIA_RPC_URL || 
                            import.meta.env.SEPOLIA_RPC_URL || 
                            'https://rpc.sepolia.org';

    // Create wallet client with admin private key
    const account = privateKeyToAccount(ADMIN_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(SEPOLIA_RPC_URL),
    });

    // Create public client for waiting for transaction
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(SEPOLIA_RPC_URL),
    });

    // Convert amount to wei (18 decimals)
    const amountWei = parseUnits(totalAmount.toString(), 18);

    // Track transaction as pending
    const { data: transactionRecord } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'claim',
        amount: totalAmount,
        status: 'pending',
      })
      .select()
      .single();

    try {
      // Transfer tokens from admin to user
      const hash = await walletClient.writeContract({
        address: TPX_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [walletAddress as `0x${string}`, amountWei],
      } as any);

      // Update transaction with hash
      if (transactionRecord) {
        await supabase
          .from('token_transactions')
          .update({ tx_hash: hash })
          .eq('id', transactionRecord.id);
      }

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // Update transaction status to confirmed
      if (transactionRecord) {
        await supabase
          .from('token_transactions')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', transactionRecord.id);
      }

    // Update database: mark quests as claimed
    const questIds = userQuests.map((uq) => uq.quest_id);
    await supabase
      .from('user_quests')
      .update({
        tokens_claimed: true,
        claimed_at: new Date().toISOString(),
      })
      .in('quest_id', questIds)
      .eq('user_id', userId);

    // Update user's total_tokens_claimed
    const { data: user } = await supabase
      .from('users')
      .select('total_tokens_claimed')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({
          total_tokens_claimed: (
            parseFloat(user.total_tokens_claimed?.toString() || '0') + totalAmount
          ).toString(),
        })
        .eq('id', userId);
    }

      return {
        success: true,
        amount: totalAmount,
        txHash: hash,
      };
    } catch (txError: any) {
      // Update transaction status to failed
      if (transactionRecord) {
        await supabase
          .from('token_transactions')
          .update({
            status: 'failed',
            error_message: txError.message,
          })
          .eq('id', transactionRecord.id);
      }
      throw txError;
    }
  } catch (error: any) {
    console.error('Error claiming TPX rewards:', error);
    return {
      success: false,
      amount: 0,
      error: error.message || 'Failed to claim rewards. Please try again.',
    };
  }
}

/**
 * Get claimable amount for user
 */
export async function getClaimableAmount(userId: string): Promise<number> {
  const { data: userQuests, error } = await supabase
    .from('user_quests')
    .select(`
      *,
      quests(reward_tokens)
    `)
    .eq('user_id', userId)
    .eq('status', 'verified')
    .eq('tokens_claimed', false);

  if (error || !userQuests) {
    return 0;
  }

  return userQuests.reduce((sum, uq) => {
    const quest = uq.quests as any;
    return sum + parseFloat(quest.reward_tokens?.toString() || '0');
  }, 0);
}

/**
 * Burn TPX tokens for secret quest unlock
 */
export async function burnTokensForSecretQuest(
  userId: string,
  amount: number,
  questId?: string
): Promise<{
  success: boolean;
  txHash?: string;
  error?: string;
}> {
  try {
    // Track burn transaction
    const { data: transactionRecord } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'burn',
        amount: amount,
        quest_id: questId || null,
        status: 'confirmed', // Burn is immediate in off-chain context
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update user's total_tokens_burned
    const { data: user } = await supabase
      .from('users')
      .select('total_tokens_burned')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({
          total_tokens_burned: (
            parseFloat(user.total_tokens_burned?.toString() || '0') + amount
          ).toString(),
        })
        .eq('id', userId);
    }

    return {
      success: true,
      txHash: transactionRecord?.tx_hash,
    };
  } catch (error: any) {
    console.error('Error burning tokens:', error);
    return {
      success: false,
      error: error.message || 'Failed to burn tokens',
    };
  }
}

/**
 * Get transaction status by tx hash
 */
export async function getTransactionStatus(txHash: string): Promise<{
  status: 'pending' | 'confirmed' | 'failed';
  transaction?: any;
}> {
  try {
    const { data, error } = await supabase
      .from('token_transactions')
      .select('*')
      .eq('tx_hash', txHash)
      .single();

    if (error || !data) {
      return { status: 'pending' };
    }

    return {
      status: data.status as 'pending' | 'confirmed' | 'failed',
      transaction: data,
    };
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return { status: 'pending' };
  }
}

