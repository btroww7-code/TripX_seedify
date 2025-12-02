import { supabase } from '../lib/supabase';
import { LeaderboardEntry } from '../lib/supabase';

export type LeaderboardPeriod = 'all-time' | 'monthly' | 'weekly';

export async function getLeaderboard(
  period: LeaderboardPeriod = 'all-time',
  limit: number = 20,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  let season: string = period;

  if (period === 'monthly') {
    const now = new Date();
    season = `monthly-${now.getFullYear()}-${now.getMonth() + 1}`;
  } else if (period === 'weekly') {
    const now = new Date();
    const week = Math.ceil(now.getDate() / 7);
    season = `weekly-${now.getFullYear()}-${now.getMonth() + 1}-${week}`;
  }

  console.log(`[getLeaderboard] Fetching leaderboard for season: ${season}, limit: ${limit}, offset: ${offset}`);

  // First, ensure all users with XP have leaderboard entries
  await ensureAllUsersInLeaderboard(season);
  
  // Recalculate ranks before fetching to ensure correct order
  await recalculateRanksManually(season);

  // Ensure we're using the correct range - Supabase range is inclusive
  const from = offset;
  const to = offset + limit - 1;
  
  console.log(`[getLeaderboard] Query range: ${from} to ${to} (limit: ${limit})`);

  const { data, error } = await supabase
    .from('leaderboard')
    .select(`
      *,
      users (
        id,
        username,
        wallet_address,
        level,
        total_xp,
        quests_completed,
        total_tokens_earned
      )
    `)
    .eq('season', season)
    .order('rank', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('[getLeaderboard] Error fetching leaderboard:', error);
    console.error('[getLeaderboard] Error details:', JSON.stringify(error, null, 2));
    return [];
  }

  // Map data to ensure we use FRESH values from users table
  const mappedData = (data || []).map((entry: any) => {
    const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
    return {
      ...entry,
      // Override with fresh data from users table
      total_xp: userData?.total_xp ?? entry.total_xp ?? 0,
      quests_completed: userData?.quests_completed ?? entry.quests_completed ?? 0,
      tokens_earned: userData?.total_tokens_earned ?? entry.tokens_earned ?? 0,
      users: userData
    };
  });

  console.log(`[getLeaderboard] Found ${mappedData.length} entries`);

  return mappedData as LeaderboardEntry[];
}

/**
 * Ensure all users with any activity are in the leaderboard for a given season
 */
async function ensureAllUsersInLeaderboard(season: string): Promise<void> {
  try {
    // Get all users who have any XP or completed quests
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, total_xp, quests_completed, total_tokens_earned')
      .or('total_xp.gt.0,quests_completed.gt.0');

    if (usersError) {
      console.error('[ensureAllUsersInLeaderboard] Error fetching users:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('[ensureAllUsersInLeaderboard] No users with activity found');
      return;
    }

    // Get existing leaderboard entries for this season
    const { data: existingEntries, error: entriesError } = await supabase
      .from('leaderboard')
      .select('user_id')
      .eq('season', season);

    if (entriesError) {
      console.error('[ensureAllUsersInLeaderboard] Error fetching existing entries:', entriesError);
      return;
    }

    const existingUserIds = new Set((existingEntries || []).map(e => e.user_id));

    // Find users without leaderboard entries
    const missingUsers = users.filter(u => !existingUserIds.has(u.id));

    if (missingUsers.length === 0) {
      console.log('[ensureAllUsersInLeaderboard] All active users already in leaderboard');
      return;
    }

    console.log(`[ensureAllUsersInLeaderboard] Adding ${missingUsers.length} missing users to leaderboard`);

    // Insert missing users into leaderboard
    const newEntries = missingUsers.map(user => ({
      user_id: user.id,
      season,
      total_xp: user.total_xp || 0,
      quests_completed: user.quests_completed || 0,
      tokens_earned: user.total_tokens_earned || 0,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('leaderboard')
      .upsert(newEntries, { onConflict: 'user_id,season' });

    if (insertError) {
      console.error('[ensureAllUsersInLeaderboard] Error inserting new entries:', insertError);
    } else {
      console.log(`[ensureAllUsersInLeaderboard] Successfully added ${missingUsers.length} users`);
    }
  } catch (error) {
    console.error('[ensureAllUsersInLeaderboard] Error:', error);
  }
}

export async function updateLeaderboard(userId: string): Promise<void> {
  try {
    console.log(`[updateLeaderboard] Updating leaderboard for user: ${userId}`);
    
    // Get user stats - ensure we get the latest data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_xp, quests_completed, total_tokens_earned')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[updateLeaderboard] Error fetching user stats for leaderboard:', userError);
      return;
    }

    if (!user) {
      console.warn('[updateLeaderboard] User not found for leaderboard update:', userId);
      return;
    }

    console.log('[updateLeaderboard] User stats:', {
      total_xp: user.total_xp,
      quests_completed: user.quests_completed,
      total_tokens_earned: user.total_tokens_earned
    });

    // Update all-time leaderboard
    await updateSeasonLeaderboard(userId, 'all-time', user);

    // Update monthly leaderboard
    const now = new Date();
    const monthlySeason = `monthly-${now.getFullYear()}-${now.getMonth() + 1}`;
    await updateSeasonLeaderboard(userId, monthlySeason, user);

    // Update weekly leaderboard
    const week = Math.ceil(now.getDate() / 7);
    const weeklySeason = `weekly-${now.getFullYear()}-${now.getMonth() + 1}-${week}`;
    await updateSeasonLeaderboard(userId, weeklySeason, user);
    
    console.log(`[updateLeaderboard] Successfully updated leaderboard for user: ${userId}`);
  } catch (error) {
    console.error('[updateLeaderboard] Error updating leaderboard:', error);
  }
}

async function updateSeasonLeaderboard(
  userId: string,
  season: string,
  userStats: { total_xp: number; quests_completed: number; total_tokens_earned: number }
): Promise<void> {
  try {
    console.log(`[updateSeasonLeaderboard] Updating season ${season} for user ${userId}`);
    
    // Convert total_tokens_earned to number if it's a string
    const tokensEarned = typeof userStats.total_tokens_earned === 'string' 
      ? parseFloat(userStats.total_tokens_earned) 
      : userStats.total_tokens_earned || 0;

    const totalXp = userStats.total_xp || 0;
    const questsCompleted = userStats.quests_completed || 0;

    console.log(`[updateSeasonLeaderboard] Season ${season} stats:`, {
      total_xp: totalXp,
      quests_completed: questsCompleted,
      tokens_earned: tokensEarned
    });

    // Upsert leaderboard entry
    const { error: upsertError } = await supabase
      .from('leaderboard')
      .upsert(
        {
          user_id: userId,
          season,
          total_xp: totalXp,
          quests_completed: questsCompleted,
          tokens_earned: tokensEarned,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,season',
        }
      );

    if (upsertError) {
      console.error(`[updateSeasonLeaderboard] Error upserting leaderboard for season ${season}:`, upsertError);
      return;
    }

    console.log(`[updateSeasonLeaderboard] Successfully upserted entry for season ${season}`);

    // Recalculate ranks for this season using RPC function if available
    try {
      const { error: recalcError } = await supabase.rpc('recalculate_leaderboard_ranks', {
        p_season: season
      });
      
      if (recalcError) {
        console.warn(`[updateSeasonLeaderboard] RPC recalculate_leaderboard_ranks not available, using fallback for ${season}:`, recalcError);
        // Fallback to manual recalculation
        await recalculateRanksManually(season);
      } else {
        console.log(`[updateSeasonLeaderboard] Successfully recalculated ranks using RPC for season ${season}`);
      }
    } catch (error) {
      console.warn(`[updateSeasonLeaderboard] Error using RPC for rank recalculation, using fallback:`, error);
      // Fallback to manual recalculation
      await recalculateRanksManually(season);
    }
  } catch (error) {
    console.error(`[updateSeasonLeaderboard] Error updating season leaderboard for ${season}:`, error);
  }
}

async function recalculateRanksManually(season: string): Promise<void> {
  try {
    console.log(`[recalculateRanksManually] Recalculating ranks for season: ${season}`);
    
    // Get all entries for this season WITH user data to use actual XP from users table
    // This ensures ranks are calculated based on current user stats, not stale leaderboard data
    const { data: entries, error: fetchError } = await supabase
      .from('leaderboard')
      .select(`
        id,
        user_id,
        total_xp,
        quests_completed,
        tokens_earned,
        users (
          total_xp,
          quests_completed,
          total_tokens_earned
        )
      `)
      .eq('season', season);

    if (fetchError) {
      console.error(`[recalculateRanksManually] Error fetching leaderboard entries for season ${season}:`, fetchError);
      return;
    }

    if (!entries || entries.length === 0) {
      console.log(`[recalculateRanksManually] No entries found for season ${season}`);
      return;
    }

    // First, sync all entries with current user data
    const syncPromises = entries.map(async (entry) => {
      const userData = Array.isArray(entry.users) ? entry.users[0] : entry.users;
      if (userData) {
        const currentXp = Number(userData.total_xp ?? 0);
        const currentQuests = Number(userData.quests_completed ?? 0);
        const currentTokens = Number(userData.total_tokens_earned ?? 0);
        
        // Only update if values differ
        if (currentXp !== entry.total_xp || currentQuests !== entry.quests_completed || 
            currentTokens !== Number(entry.tokens_earned)) {
          return supabase
            .from('leaderboard')
            .update({
              total_xp: currentXp,
              quests_completed: currentQuests,
              tokens_earned: currentTokens,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);
        }
      }
      return null;
    });

    await Promise.all(syncPromises.filter(p => p !== null));

    // Sort entries using ACTUAL data from users table (not stale leaderboard data)
    // Sort by: total_xp DESC (from users), then quests_completed DESC, then tokens_earned DESC
    const sortedEntries = [...entries].sort((a, b) => {
      // Handle users data - it might be an object or array (Supabase can return either)
      const aUser = Array.isArray(a.users) ? a.users[0] : a.users;
      const bUser = Array.isArray(b.users) ? b.users[0] : b.users;
      
      // Use actual XP from users table, fallback to leaderboard if not available
      const aXp = Number(aUser?.total_xp ?? a.total_xp ?? 0);
      const bXp = Number(bUser?.total_xp ?? b.total_xp ?? 0);
      
      // First by total_xp (from users table - always current) - DESC order (higher first)
      if (bXp !== aXp) {
        return bXp - aXp; // Positive = b comes first (higher XP)
      }
      
      // Then by quests_completed
      const aQuests = Number(aUser?.quests_completed ?? a.quests_completed ?? 0);
      const bQuests = Number(bUser?.quests_completed ?? b.quests_completed ?? 0);
      if (bQuests !== aQuests) {
        return bQuests - aQuests; // DESC order
      }
      
      // Finally by tokens_earned
      const aTokens = Number(aUser?.total_tokens_earned ?? a.tokens_earned ?? 0);
      const bTokens = Number(bUser?.total_tokens_earned ?? b.tokens_earned ?? 0);
      return bTokens - aTokens; // DESC order
    });
    
    // Log first few entries for debugging
    if (sortedEntries.length > 0) {
      console.log(`[recalculateRanksManually] Sample sorted entries (first 3):`, 
        sortedEntries.slice(0, 3).map((e, idx) => {
          const user = Array.isArray(e.users) ? e.users[0] : e.users;
          return {
            rank: idx + 1,
            user_id: e.user_id?.slice(0, 8),
            xp: Number(user?.total_xp ?? e.total_xp ?? 0),
            quests: Number(user?.quests_completed ?? e.quests_completed ?? 0)
          };
        })
      );
    }

    console.log(`[recalculateRanksManually] Sorted ${sortedEntries.length} entries for season ${season}`);

    // Update ranks in batch using a more efficient approach
    const rankUpdates = sortedEntries.map((entry, index) => ({
      id: entry.id,
      rank: index + 1,
    }));

    // Update ranks in batches of 50
    const batchSize = 50;
    for (let i = 0; i < rankUpdates.length; i += batchSize) {
      const batch = rankUpdates.slice(i, i + batchSize);
      
      // Use Promise.all for parallel updates within batch
      const updatePromises = batch.map((update) =>
        supabase
          .from('leaderboard')
          .update({ rank: update.rank })
          .eq('id', update.id)
      );
      
      const results = await Promise.all(updatePromises);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error(`[recalculateRanksManually] Errors updating ranks for batch ${i / batchSize + 1}:`, errors);
      }
    }

    console.log(`[recalculateRanksManually] Successfully recalculated ranks for season ${season}`);
  } catch (error) {
    console.error(`[recalculateRanksManually] Error recalculating ranks for season ${season}:`, error);
  }
}

export async function getUserRank(userId: string, period: LeaderboardPeriod = 'all-time'): Promise<number | null> {
  let season: string = period;

  if (period === 'monthly') {
    const now = new Date();
    season = `monthly-${now.getFullYear()}-${now.getMonth() + 1}`;
  } else if (period === 'weekly') {
    const now = new Date();
    const week = Math.ceil(now.getDate() / 7);
    season = `weekly-${now.getFullYear()}-${now.getMonth() + 1}-${week}`;
  }

  console.log(`[getUserRank] Fetching rank for user: ${userId}, season: ${season}`);

  const { data, error } = await supabase
    .from('leaderboard')
    .select('rank, total_xp, quests_completed, tokens_earned')
    .eq('user_id', userId)
    .eq('season', season)
    .maybeSingle();

  if (error) {
    console.error('[getUserRank] Error fetching user rank:', error);
    return null;
  }

  if (!data) {
    console.warn(`[getUserRank] No leaderboard entry found for user ${userId} in season ${season}`);
    // Try to update leaderboard for this user if they don't have an entry
    try {
      console.log(`[getUserRank] Attempting to create leaderboard entry for user ${userId}`);
      await updateLeaderboard(userId);
      // Try again after update
      const { data: retryData } = await supabase
        .from('leaderboard')
        .select('rank')
        .eq('user_id', userId)
        .eq('season', season)
        .maybeSingle();
      return retryData?.rank || null;
    } catch (updateError) {
      console.error('[getUserRank] Error updating leaderboard:', updateError);
      return null;
    }
  }

  console.log(`[getUserRank] User rank found: ${data.rank}`);
  return data.rank || null;
}

/**
 * Get total count of leaderboard entries for a period
 */
export async function getLeaderboardCount(period: LeaderboardPeriod = 'all-time'): Promise<number> {
  let season: string = period;

  if (period === 'monthly') {
    const now = new Date();
    season = `monthly-${now.getFullYear()}-${now.getMonth() + 1}`;
  } else if (period === 'weekly') {
    const now = new Date();
    const week = Math.ceil(now.getDate() / 7);
    season = `weekly-${now.getFullYear()}-${now.getMonth() + 1}-${week}`;
  }

  console.log(`[getLeaderboardCount] Fetching count for season: ${season}`);

  const { count, error } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .eq('season', season);

  if (error) {
    console.error('[getLeaderboardCount] Error fetching count:', error);
    console.error('[getLeaderboardCount] Error details:', JSON.stringify(error, null, 2));
    return 0;
  }

  console.log(`[getLeaderboardCount] Found ${count || 0} entries for season ${season}`);
  return count || 0;
}

/**
 * Initialize leaderboard for all existing users
 * Call this once to populate leaderboard with current user stats
 */
export async function initializeLeaderboard(): Promise<void> {
  try {
    const { error } = await supabase.rpc('initialize_leaderboard');
    if (error) {
      console.error('Error initializing leaderboard:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
    throw error;
  }
}

/**
 * Recalculate ranks for a specific season
 */
export async function recalculateLeaderboardRanks(season: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('recalculate_leaderboard_ranks', {
      p_season: season
    });
    if (error) {
      console.error('Error recalculating leaderboard ranks:', error);
    }
  } catch (error) {
    console.error('Error recalculating leaderboard ranks:', error);
  }
}

