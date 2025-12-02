import { supabase } from '../lib/supabase';

export interface PendingClaim {
  id: string;
  user_id: string;
  total_amount: number;
  quest_rewards: Array<{
    quest_id: string;
    amount: number;
  }>;
  last_updated: string;
  created_at: string;
}

export async function getPendingClaims(userId: string): Promise<PendingClaim | null> {
  console.log('[getPendingClaims] Starting for user:', userId);
  
  // Step 1: Get pending_claims from database
  const { data: pendingData, error: pendingError } = await supabase
    .from('pending_claims')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (pendingError) {
    console.error('[getPendingClaims] Error fetching pending claims:', pendingError);
    return null;
  }

  if (!pendingData) {
    console.log('[getPendingClaims] No pending_claims record found - returning null');
    return null;
  }

  console.log('[getPendingClaims] Found pending_claims:', {
    id: pendingData.id,
    total_amount: pendingData.total_amount,
    quest_rewards_count: pendingData.quest_rewards?.length || 0
  });

  // Step 2: Validate pending_claims structure
  if (!pendingData.quest_rewards || !Array.isArray(pendingData.quest_rewards) || pendingData.quest_rewards.length === 0) {
    console.log('[getPendingClaims] ❌ No quest_rewards in pending_claims - deleting and returning null');
    await supabase.from('pending_claims').delete().eq('id', pendingData.id);
    return null;
  }

  const rawTotal = parseFloat(pendingData.total_amount?.toString() || '0');
  if (!rawTotal || rawTotal <= 0 || isNaN(rawTotal)) {
    console.log('[getPendingClaims] ❌ Invalid total_amount:', rawTotal, '- deleting and returning null');
    await supabase.from('pending_claims').delete().eq('id', pendingData.id);
    return null;
  }

  // Step 3: Get quest IDs from pending claims
  const questIds = pendingData.quest_rewards.map((r: any) => r.quest_id).filter(Boolean);
  
  if (questIds.length === 0) {
    console.log('[getPendingClaims] ❌ No valid quest IDs in pending_claims - deleting');
    await supabase.from('pending_claims').delete().eq('id', pendingData.id);
    return null;
  }

  // Step 4: CRITICAL - Check user_quests.tokens_claimed flag (PRIMARY SOURCE OF TRUTH)
  // This is the definitive check - if tokens_claimed is true, quest is already claimed
  const { data: userQuests, error: userQuestsError } = await supabase
    .from('user_quests')
    .select('quest_id, status, tokens_claimed')
    .eq('user_id', userId)
    .in('quest_id', questIds);

  if (userQuestsError) {
    console.error('[getPendingClaims] Error fetching user_quests:', userQuestsError);
    return null;
  }

  // Create lookup maps for quick access
  const questStatusMap = new Map<string, { status: string; tokens_claimed: boolean }>();
  (userQuests || []).forEach((uq: any) => {
    questStatusMap.set(String(uq.quest_id), {
      status: uq.status,
      tokens_claimed: uq.tokens_claimed === true
    });
  });

  console.log('[getPendingClaims] User quests status:', Array.from(questStatusMap.entries()));

  // Step 5: Filter rewards - only include quests that are:
  // - completed/verified
  // - tokens_claimed is NOT true
  // - have valid amount
  const unclaimedRewards = pendingData.quest_rewards.filter((reward: any) => {
    if (!reward.quest_id) {
      console.warn('[getPendingClaims] Reward missing quest_id:', reward);
      return false;
    }
    
    const questIdStr = String(reward.quest_id);
    const questInfo = questStatusMap.get(questIdStr);
    
    // Quest must exist in user_quests
    if (!questInfo) {
      console.log('[getPendingClaims] ❌ Quest not found in user_quests:', questIdStr);
      return false;
    }
    
    // Quest must be completed or verified
    if (questInfo.status !== 'completed' && questInfo.status !== 'verified') {
      console.log('[getPendingClaims] ❌ Quest not completed/verified:', questIdStr, 'status:', questInfo.status);
      return false;
    }
    
    // CRITICAL: tokens_claimed must NOT be true
    if (questInfo.tokens_claimed === true) {
      console.log('[getPendingClaims] ❌ Tokens already claimed for quest:', questIdStr);
      return false;
    }
    
    // Amount must be valid
    const amount = parseFloat(reward.amount) || 0;
    if (amount <= 0) {
      console.warn('[getPendingClaims] Reward has invalid amount:', reward);
      return false;
    }
    
    console.log('[getPendingClaims] ✅ Quest eligible for claim:', questIdStr, 'amount:', amount);
    return true;
  });

  console.log('[getPendingClaims] Filtered rewards:', {
    before: pendingData.quest_rewards.length,
    after: unclaimedRewards.length,
    filtered_out: pendingData.quest_rewards.length - unclaimedRewards.length
  });

  // Step 6: If no unclaimed rewards, clean up pending_claims and return null
  if (unclaimedRewards.length === 0) {
    console.log('[getPendingClaims] ❌ No unclaimed rewards - deleting pending_claims');
    await supabase.from('pending_claims').delete().eq('id', pendingData.id);
    return null;
  }

  // Step 7: Calculate total from unclaimed rewards only
  const totalAmount = unclaimedRewards.reduce(
    (sum: number, r: any) => sum + (parseFloat(r.amount) || 0),
    0
  );

  if (totalAmount <= 0) {
    console.log('[getPendingClaims] ❌ Total amount is 0 or negative - deleting pending_claims');
    await supabase.from('pending_claims').delete().eq('id', pendingData.id);
    return null;
  }

  // Step 8: Update pending_claims in DB if filtered amount differs from stored amount
  // This ensures DB is always in sync with actual claimable amount
  if (unclaimedRewards.length !== pendingData.quest_rewards.length) {
    console.log('[getPendingClaims] Updating pending_claims with filtered rewards...');
    const { error: updateError } = await supabase
      .from('pending_claims')
      .update({
        total_amount: totalAmount,
        quest_rewards: unclaimedRewards,
        last_updated: new Date().toISOString()
      })
      .eq('id', pendingData.id);
    
    if (updateError) {
      console.warn('[getPendingClaims] Failed to sync pending_claims:', updateError);
    }
  }

  console.log('[getPendingClaims] ✅ Returning valid pending claims:', {
    total_amount: totalAmount,
    quest_rewards_count: unclaimedRewards.length,
    quest_ids: unclaimedRewards.map((r: any) => r.quest_id)
  });

  return {
    ...pendingData,
    total_amount: totalAmount,
    quest_rewards: unclaimedRewards,
  };
}

export async function claimTokens(userId: string, walletAddress: string): Promise<{
  success: boolean;
  amount?: number;
  txHash?: string;
  error?: string;
}> {
  try {
    console.log('[claimTokens] Frontend-only claim starting...');
    
    // Use frontend-only API (no backend needed)
    const { claimRewardsAPI } = await import('./web3ApiClient');
    const result = await claimRewardsAPI(userId, walletAddress);

    if (!result.success) {
      throw new Error(result.error || 'Failed to claim tokens');
    }

    console.log('[claimTokens] Claim successful:', result.data);

    return {
      success: true,
      amount: result.data?.amount,
      txHash: result.data?.txHash,
    };
  } catch (error: any) {
    console.error('[claimTokens] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to claim tokens',
    };
  }
}

export async function getTokenTransactions(
  userId: string,
  limit: number = 50,
  walletAddress?: string
): Promise<TokenTransaction[]> {
  // Get transactions from database
  const { data: dbTransactions, error } = await supabase
    .from('token_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching token transactions from database:', error);
  }

  const dbTxList = dbTransactions || [];

  // If wallet address is provided, also fetch from blockchain
  if (walletAddress) {
    try {
      const { getBlockchainTokenTransactions } = await import('./blockchainTransactionService');
      const blockchainTxs = await getBlockchainTokenTransactions(walletAddress, limit);

      // Merge and deduplicate transactions
      const txMap = new Map<string, TokenTransaction>();

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
          // Convert blockchain transaction to TokenTransaction format
          const tokenTx: TokenTransaction = {
            id: `blockchain_${btx.txHash}`,
            user_id: userId,
            quest_id: null,
            transaction_type: 'reward', // Assume reward for incoming transfers
            amount: btx.amount,
            tx_hash: btx.txHash,
            status: 'confirmed',
            blockchain_confirmed_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : undefined,
            contract_address: btx.contractAddress,
            from_address: btx.from,
            to_address: btx.to,
            block_number: Number(btx.blockNumber),
            metadata: {
              source: 'blockchain',
              timestamp: btx.timestamp,
            },
            created_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : new Date().toISOString(),
            updated_at: btx.timestamp ? new Date(btx.timestamp * 1000).toISOString() : new Date().toISOString(),
          };
          txMap.set(txHashLower, tokenTx);
        }
      }

      // Convert map to array and sort by created_at (newest first)
      const allTransactions = Array.from(txMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      return allTransactions.slice(0, limit);
    } catch (error) {
      console.error('Error fetching blockchain transactions:', error);
      // Return database transactions if blockchain fetch fails
      return dbTxList;
    }
  }

  return dbTxList;
}

export async function addRewardToPending(
  userId: string,
  questId: string,
  amount: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('add_pending_reward', {
      p_user_id: userId,
      p_quest_id: questId,
      p_amount: amount,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding pending reward:', error);
    return false;
  }
}

export async function getTokenBalance(walletAddress: string): Promise<number> {
  try {
    const { getTPXBalance } = await import('./web3Service');
    return await getTPXBalance(walletAddress);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

export function calculateQuestReward(difficulty: number, questType: string): number {
  const baseReward = 10;
  const difficultyMultiplier = difficulty;

  let typeMultiplier = 1;
  switch (questType) {
    case 'photo':
      typeMultiplier = 1.5;
      break;
    case 'secret':
      typeMultiplier = 3;
      break;
    case 'sponsored':
      typeMultiplier = 2;
      break;
    default:
      typeMultiplier = 1;
  }

  return Math.round(baseReward * difficultyMultiplier * typeMultiplier);
}

export async function burnTokensForQuest(
  userId: string,
  questId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        quest_id: questId,
        transaction_type: 'burn',
        amount: -amount,
        status: 'confirmed',
        blockchain_confirmed_at: new Date().toISOString(),
        metadata: { reason: 'secret_quest_unlock' },
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error burning tokens:', error);
    return { success: false, error: error.message };
  }
}

export function formatTokenAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    claim: 'Claimed',
    burn: 'Burned',
    reward: 'Reward Earned',
    transfer: 'Transfer',
  };
  return labels[type] || type;
}

export function getTransactionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    claim: 'green',
    burn: 'red',
    reward: 'cyan',
    transfer: 'purple',
  };
  return colors[type] || 'gray';
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  quest_id: string | null;
  transaction_type: string;
  amount: number;
  tx_hash: string | null;
  status: string;
  blockchain_confirmed_at?: string;
  contract_address?: string;
  from_address?: string;
  to_address?: string;
  block_number?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
}
