import { supabase } from '../lib/supabase';

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  category?: string;
  requirement_type?: string;
  requirement_value?: number;
  reward_tokens?: number;
  reward_xp?: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  quest_id?: string;
  unlocked_at: string | null;
  progress?: number;
  reward_tokens_claimed?: boolean;
  reward_xp_claimed?: boolean;
  nft_minted?: boolean;
  nft_token_id?: number;
  nft_tx_hash?: string;
  nft_minted_at?: string;
  metadata?: any;
  achievements?: Achievement;
}

/**
 * Check and unlock achievements for a user
 * This calls the SQL function check_achievements which automatically
 * checks if user qualifies for any achievements and unlocks them
 * Returns list of newly unlocked achievements
 */
export async function checkAchievements(userId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase.rpc('check_achievements', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error checking achievements:', error);
      return [];
    }

    // Get details of newly unlocked achievements
    if (data && data.length > 0) {
      const achievementIds = data.map((a: any) => a.achievement_id);
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .in('id', achievementIds);

      return achievements || [];
    }

    return [];
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Get all achievements for a user
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select(`
      *,
      achievements (*)
    `)
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all available achievements
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .or('is_active.is.null,is_active.eq.true')
    .order('requirement_value', { ascending: true });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user achievement progress for a specific achievement
 */
export async function getUserAchievementProgress(
  userId: string,
  achievementId: string
): Promise<{ current: number; unlocked: boolean }> {
  try {
    // First, get the achievement to understand what we're tracking
    const { data: achievement } = await supabase
      .from('achievements')
      .select('requirement_type, requirement_value')
      .eq('id', achievementId)
      .single();

    if (!achievement) {
      return { current: 0, unlocked: false };
    }

    // Check if already unlocked
    const { data: userAchievement } = await supabase
      .from('user_achievements')
      .select('unlocked_at, progress')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .maybeSingle();

    if (userAchievement?.unlocked_at) {
      return {
        current: achievement.requirement_value || 0,
        unlocked: true
      };
    }

    // Calculate current progress based on requirement_type
    let currentProgress = 0;

    switch (achievement.requirement_type) {
      case 'quests': {
        const { data: user } = await supabase
          .from('users')
          .select('quests_completed')
          .eq('id', userId)
          .single();
        currentProgress = user?.quests_completed || 0;
        break;
      }
      case 'trips': {
        const { count } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);
        currentProgress = count || 0;
        break;
      }
      case 'cities': {
        const { count } = await supabase
          .from('trips')
          .select('destination', { count: 'exact', head: true })
          .eq('user_id', userId);
        // Get distinct cities
        const { data: trips } = await supabase
          .from('trips')
          .select('destination')
          .eq('user_id', userId);
        if (trips) {
          const uniqueCities = new Set(trips.map(t => t.destination));
          currentProgress = uniqueCities.size;
        }
        break;
      }
      case 'photos': {
        const { count } = await supabase
          .from('user_quests')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .not('proof_image_url', 'is', null);
        currentProgress = count || 0;
        break;
      }
      case 'tokens': {
        const { data: user } = await supabase
          .from('users')
          .select('total_tokens_earned')
          .eq('id', userId)
          .single();
        currentProgress = parseFloat(user?.total_tokens_earned?.toString() || '0');
        break;
      }
      default:
        // Use progress from user_achievements if available
        currentProgress = userAchievement?.progress || 0;
    }

    return {
      current: Math.min(currentProgress, achievement.requirement_value || 0),
      unlocked: false
    };
  } catch (error) {
    console.error('Error getting achievement progress:', error);
    return { current: 0, unlocked: false };
  }
}

/**
 * Update all achievement progress for a user
 * This should be called after significant user actions (quest completion, XP gain, etc.)
 */
export async function updateAllAchievementProgress(userId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_all_achievement_progress', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error updating achievement progress:', error);
    }
  } catch (error) {
    console.error('Error updating achievement progress:', error);
  }
}

