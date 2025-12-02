import { supabase } from '../lib/supabase';
import { updateUserXP, incrementQuestsCompleted } from './userService';
import { updateLeaderboard } from './leaderboardService';
import { checkAchievements } from './achievementService';
import { addRewardToPending, calculateQuestReward } from './tokenService';

export interface QuestCompletionData {
  userId: string;
  questId: string;
  proofImageUrl?: string;
  verificationResult: {
    gps_verified: boolean;
    distance: number;
    accuracy: number;
    timestamp: string;
    location: {
      lat: number;
      lng: number;
    };
    photo_verified?: boolean;
    ai_analysis?: string;
  };
}

/**
 * Start a quest (mark as in_progress)
 */
export async function startQuest(userId: string, questId: string) {
  const { data: existingUserQuest } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .maybeSingle();

  if (existingUserQuest) {
    if (existingUserQuest.status === 'completed') {
      throw new Error('Quest already completed');
    }
    return existingUserQuest;
  }

  const { data, error } = await supabase
    .from('user_quests')
    .insert({
      user_id: userId,
      quest_id: questId,
      status: 'in_progress',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start quest: ${error.message}`);
  }

  return data;
}

/**
 * Complete a quest and distribute rewards
 */
export async function completeQuest(completionData: QuestCompletionData) {
  const { userId, questId, proofImageUrl, verificationResult } = completionData;

  // Get quest details
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .single();

  if (questError || !quest) {
    throw new Error('Quest not found');
  }

  // Check if quest is already completed
  const { data: existingCompletion } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .maybeSingle();

  if (existingCompletion?.status === 'completed') {
    throw new Error('Quest already completed');
  }

  // Verify GPS and optional photo
  if (!verificationResult.gps_verified) {
    throw new Error('GPS verification failed');
  }

  // Update or create user_quest record
  const userQuestData = {
    user_id: userId,
    quest_id: questId,
    status: 'completed',
    proof_image_url: proofImageUrl,
    verification_result: verificationResult,
    completed_at: new Date().toISOString(),
    tokens_claimed: false,
  };

  let userQuest;
  if (existingCompletion) {
    const { data, error } = await supabase
      .from('user_quests')
      .update(userQuestData)
      .eq('id', existingCompletion.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update quest: ${error.message}`);
    userQuest = data;
  } else {
    const { data, error } = await supabase
      .from('user_quests')
      .insert(userQuestData)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete quest: ${error.message}`);
    userQuest = data;
  }

  // Distribute rewards
  await distributeQuestRewards(userId, quest);

  // Increment quest completion counter
  await incrementQuestsCompleted(userId);

  // Update leaderboard
  await updateLeaderboard(userId);

  // Update achievement progress and check for new achievements
  const { updateAllAchievementProgress, checkAchievements } = await import('./achievementService');
  await updateAllAchievementProgress(userId);
  const newlyUnlocked = await checkAchievements(userId);
  
  // Log newly unlocked achievements
  if (newlyUnlocked && newlyUnlocked.length > 0) {
    console.log(`[completeQuest] User ${userId} unlocked ${newlyUnlocked.length} new achievements:`, 
      newlyUnlocked.map(a => a.title));
  }

  // NFT minting is now manual - user must click "Mint NFT" button
  // NFT will be minted only for quests with nft_reward = true

  return {
    userQuest,
    rewards: {
      xp: quest.reward_xp,
      tokens: quest.reward_tokens,
      nftAvailable: quest.nft_reward || false,
    },
  };
}

/**
 * Distribute XP and tokens for quest completion
 */
async function distributeQuestRewards(userId: string, quest: any) {
  // Award XP
  await updateUserXP(userId, quest.reward_xp || 100);

  // Calculate token reward
  const tokenReward = quest.reward_tokens || calculateQuestReward(
    quest.difficulty || 3,
    quest.type || 'standard'
  );

  // Add to pending claims
  await addRewardToPending(userId, quest.id, tokenReward);

  // Update total tokens earned counter
  const { data: currentUser } = await supabase
    .from('users')
    .select('total_tokens_earned')
    .eq('id', userId)
    .single();

  if (currentUser) {
    await supabase
      .from('users')
      .update({
        total_tokens_earned: (parseFloat(currentUser.total_tokens_earned?.toString() || '0') + tokenReward).toString(),
      })
      .eq('id', userId);
    
    // Check achievements after updating tokens (achievements may depend on total_tokens_earned)
    const { updateAllAchievementProgress, checkAchievements } = await import('./achievementService');
    await updateAllAchievementProgress(userId);
    const newlyUnlocked = await checkAchievements(userId);
    
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      console.log(`[distributeQuestRewards] User ${userId} unlocked ${newlyUnlocked.length} new achievements after token update:`, 
        newlyUnlocked.map(a => a.title));
    }
  }

  console.log(`\u2705 Rewards: ${quest.reward_xp} XP, ${tokenReward} TPX (pending)`);
}

/**
 * Claim tokens (blockchain transaction)
 */
export async function claimQuestTokens(userId: string, questId: string) {
  const { data: userQuest, error } = await supabase
    .from('user_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .eq('status', 'completed')
    .eq('tokens_claimed', false)
    .single();

  if (error || !userQuest) {
    throw new Error('Quest not completed or tokens already claimed');
  }

  // Mark tokens as claimed
  await supabase
    .from('user_quests')
    .update({
      tokens_claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', userQuest.id);

  // Update token transaction status
  await supabase
    .from('token_transactions')
    .update({ status: 'confirmed' })
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .eq('status', 'pending');

  return true;
}

/**
 * Get user's quest progress
 */
export async function getUserQuestProgress(userId: string, questId: string) {
  const { data, error } = await supabase
    .from('user_quests')
    .select(`
      *,
      quests (*)
    `)
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch quest progress: ${error.message}`);
  }

  return data;
}

/**
 * Get all user quests with filtering
 * Also syncs NFT minted status from nft_transactions table
 */
export async function getUserQuests(
  userId: string,
  filters: {
    status?: 'pending' | 'in_progress' | 'completed';
    limit?: number;
  } = {}
) {
  console.log('[getUserQuests] Called with userId:', userId);
  console.log('[getUserQuests] Filters:', filters);
  
  let query = supabase
    .from('user_quests')
    .select(`
      *,
      quests (
        *
      )
    `)
    .eq('user_id', userId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  console.log('[getUserQuests] Executing query...');
  const { data, error } = await query;

  if (error) {
    console.error('[getUserQuests] Query failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to fetch user quests: ${error.message}`);
  }

  // SYNC: Check nft_transactions for any minted NFTs that might not be synced to user_quests
  if (data && data.length > 0) {
    const questIds = data.map((uq: any) => uq.quest_id).filter(Boolean);
    
    const { data: nftTxs } = await supabase
      .from('nft_transactions')
      .select('quest_id, token_id, tx_hash')
      .eq('user_id', userId)
      .in('quest_id', questIds)
      .eq('nft_type', 'achievement')
      .eq('status', 'confirmed');
    
    if (nftTxs && nftTxs.length > 0) {
      console.log('[getUserQuests] Found', nftTxs.length, 'NFT transactions to sync');
      
      // Create a map of quest_id -> nft_transaction
      const nftMap = new Map(nftTxs.map((tx: any) => [tx.quest_id, tx]));
      
      // Update local data with NFT info and sync to database
      for (const uq of data) {
        const nftTx = nftMap.get(uq.quest_id);
        if (nftTx && !uq.nft_minted) {
          console.log('[getUserQuests] Syncing NFT status for quest:', uq.quest_id);
          uq.nft_minted = true;
          uq.nft_token_id = nftTx.token_id;
          uq.nft_tx_hash = nftTx.tx_hash;
          
          // Also update database in background
          supabase
            .from('user_quests')
            .update({
              nft_minted: true,
              nft_token_id: nftTx.token_id,
              nft_tx_hash: nftTx.tx_hash,
            })
            .eq('id', uq.id)
            .then(({ error: updateError }) => {
              if (updateError) {
                console.warn('[getUserQuests] Failed to sync NFT status to DB:', updateError);
              }
            });
        }
      }
    }
  }

  console.log('[getUserQuests] Query success - found', data?.length || 0, 'quests');
  return data || [];
}

/**
 * Get quest completion statistics for a user
 */
export async function getUserQuestStats(userId: string) {
  const { data, error } = await supabase
    .from('user_quests')
    .select('status, completed_at')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch user quest stats: ${error.message}`);
  }

  const total = data.length;
  const completed = data.filter((uq) => uq.status === 'completed').length;
  const inProgress = data.filter((uq) => uq.status === 'in_progress').length;
  const pending = data.filter((uq) => uq.status === 'pending').length;

  // Calculate completion rate by category
  const { data: questsWithCategories } = await supabase
    .from('user_quests')
    .select(`
      status,
      quests!inner (
        category
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed');

  const categoryCounts: Record<string, number> = {};
  questsWithCategories?.forEach((uq: any) => {
    const category = uq.quests?.category || 'other';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    total_quests: total,
    completed: completed,
    in_progress: inProgress,
    pending: pending,
    completion_rate: total > 0 ? (completed / total) * 100 : 0,
    by_category: categoryCounts,
  };
}

/**
 * Track detailed quest progress steps
 */
export async function updateQuestProgress(
  userQuestId: string,
  stepName: string,
  stepData: Record<string, any>,
  completed: boolean = false
) {
  const { data, error } = await supabase
    .from('quest_progress')
    .insert({
      user_quest_id: userQuestId,
      step_name: stepName,
      step_data: stepData,
      completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update progress: ${error.message}`);
  }

  return data;
}

/**
 * Get quest progress steps
 */
export async function getQuestProgressSteps(userQuestId: string) {
  const { data, error } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_quest_id', userQuestId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch progress steps: ${error.message}`);
  }

  return data || [];
}

/**
 * Cancel or abandon a quest
 */
export async function abandonQuest(userId: string, questId: string) {
  const { error } = await supabase
    .from('user_quests')
    .delete()
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .neq('status', 'completed'); // Don't allow deleting completed quests

  if (error) {
    throw new Error(`Failed to abandon quest: ${error.message}`);
  }

  return true;
}
