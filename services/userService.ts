import { supabase, User } from '../lib/supabase';

/**
 * Get client IP address from request headers
 */
function getClientIP(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get IP from various headers (for server-side)
  // For client-side, we'll need to get it from backend
  return null;
}

/**
 * Get user agent
 */
function getUserAgent(): string | null {
  if (typeof window === 'undefined') return null;
  return navigator.userAgent || null;
}

export async function getOrCreateUser(walletAddress: string, registrationIP?: string): Promise<User | null> {
  if (!walletAddress) return null;

  try {
    console.log('[UserService] Looking for user with wallet:', walletAddress.toLowerCase());
    
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .maybeSingle();

    // PGRST116 = no rows returned (not an error)
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('[UserService] Error fetching user:', fetchError);
      // Continue anyway - might be RLS policy issue
    }

    if (existingUser) {
      console.log('[UserService] Found existing user:', existingUser.id);
      
      // Update login tracking
      const userAgent = getUserAgent();
      const { error: trackingError } = await supabase.rpc('update_user_login_tracking', {
        p_user_id: existingUser.id,
        p_login_ip: registrationIP || null,
        p_user_agent: userAgent
      });
      if (trackingError) {
        console.warn('[UserService] Error updating login tracking:', trackingError);
      }
      
      return existingUser as User;
    }
    
    console.log('[UserService] No existing user found, creating new...');

    // Create new user (only if no 401 error)
    if (fetchError?.code === 'PGRST301' || fetchError?.message?.includes('401')) {
      console.warn('Supabase authentication required - user creation skipped');
      return null;
    }

    const userAgent = getUserAgent();
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        total_xp: 0,
        level: 1,
        passport_tier: 'bronze',
        quests_completed: 0,
        total_tokens_earned: 0,
        registration_at: new Date().toISOString(),
        registration_ip: registrationIP || null,
        user_agent: userAgent,
        login_count: 1,
        last_login_at: new Date().toISOString(),
        last_login_ip: registrationIP || null,
        last_user_agent: userAgent,
      })
      .select()
      .single();

    if (createError) {
      // Don't log as error if it's auth-related
      if (createError.code === 'PGRST301' || createError.message?.includes('401')) {
        console.warn('Supabase authentication required - user creation skipped');
      } else {
        console.warn('Error creating user (non-critical):', createError);
      }
      return null;
    }

    return newUser as User;
  } catch (error) {
    console.warn('User service error (non-critical):', error);
    return null;
  }
}

export async function getUser(userId: string): Promise<User | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User | null;
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  if (!walletAddress) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User | null;
}

export async function updateUserXP(userId: string, xpGain: number): Promise<{ levelUp: boolean; newLevel: number; oldLevel: number }> {
  const { data: user } = await supabase
    .from('users')
    .select('total_xp, level')
    .eq('id', userId)
    .single();

  if (!user) return { levelUp: false, newLevel: 1, oldLevel: 1 };

  const oldLevel = user.level || 1;
  const newXP = (user.total_xp || 0) + xpGain;
  const newLevel = calculateLevel(newXP);
  const levelUp = newLevel > oldLevel;

  await supabase
    .from('users')
    .update({
      total_xp: newXP,
      level: newLevel,
      passport_tier: getPassportTier(newLevel),
    })
    .eq('id', userId);

  // If level up, check for achievements
  if (levelUp) {
    const { updateAllAchievementProgress, checkAchievements } = await import('./achievementService');
    await updateAllAchievementProgress(userId);
    await checkAchievements(userId);
  }

  return { levelUp, newLevel, oldLevel };
}

export function calculateLevel(totalXP: number): number {
  // Level formula: level = floor(sqrt(totalXP / 100)) + 1
  return Math.floor(Math.sqrt(totalXP / 100)) + 1;
}

export function getPassportTier(level: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (level >= 15) return 'platinum';
  if (level >= 10) return 'gold';
  if (level >= 5) return 'silver';
  return 'bronze';
}

export async function incrementQuestsCompleted(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_quests_completed', { user_id: userId });
  if (error) {
    // Fallback if RPC doesn't exist
    const { data: user } = await supabase
      .from('users')
      .select('quests_completed')
      .eq('id', userId)
      .single();

    if (user) {
      await supabase
        .from('users')
        .update({ quests_completed: (user.quests_completed || 0) + 1 })
        .eq('id', userId);
    }
  }
}

