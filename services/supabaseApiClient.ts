/**
 * Supabase API Client - Frontend Only
 * Direct database operations (no backend required)
 */

import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  wallet_address?: string | null;
  email?: string | null;
  username?: string;
  total_xp: number;
  level: number;
  passport_tier: string;
  quests_completed: number;
  total_tokens_earned: number;
  nft_passport_token_id?: number | null;
  nft_passport_minted?: boolean;
  registration_at?: string;
  last_login_at?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  reward_xp: number;
  reward_tokens: number;
  difficulty: number;
  is_active: boolean;
  image_url?: string;
  created_at?: string;
}

export interface UserQuest {
  id: string;
  user_id: string;
  quest_id: string;
  status: 'pending' | 'completed' | 'verified';
  proof_image_url?: string;
  nft_token_id?: number | null;
  nft_minted?: boolean;
  completed_at?: string;
  created_at?: string;
}

/**
 * Get or create user by wallet address
 */
export async function getOrCreateUser(walletAddress: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[getOrCreateUser] Error fetching user:', fetchError);
      return { success: false, error: 'Failed to fetch user' };
    }

    if (existingUser) {
      // Update last login
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          login_count: (existingUser.login_count || 0) + 1
        })
        .eq('id', existingUser.id);

      return { success: true, user: existingUser };
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        wallet_address: normalizedAddress,
        total_xp: 0,
        level: 1,
        passport_tier: 'bronze',
        quests_completed: 0,
        total_tokens_earned: 0,
        registration_at: new Date().toISOString(),
        login_count: 1,
        last_login_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('[getOrCreateUser] Error creating user:', createError);
      return { success: false, error: 'Failed to create user' };
    }

    return { success: true, user: newUser };
  } catch (error: any) {
    console.error('[getOrCreateUser] Error:', error);
    return { success: false, error: error.message || 'Failed to get or create user' };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user: data };
  } catch (error: any) {
    console.error('[getUserById] Error:', error);
    return { success: false, error: error.message || 'Failed to get user' };
  }
}

/**
 * Get all active quests
 */
export async function getQuests(): Promise<{ success: boolean; quests?: Quest[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('quests')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getQuests] Error:', error);
      return { success: false, error: 'Failed to fetch quests' };
    }

    return { success: true, quests: data || [] };
  } catch (error: any) {
    console.error('[getQuests] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch quests' };
  }
}

/**
 * Get user's quests
 */
export async function getUserQuests(userId: string): Promise<{ success: boolean; quests?: UserQuest[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUserQuests] Error:', error);
      return { success: false, error: 'Failed to fetch user quests' };
    }

    return { success: true, quests: data || [] };
  } catch (error: any) {
    console.error('[getUserQuests] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch user quests' };
  }
}

/**
 * Complete a quest using database function
 */
export async function completeQuest(
  userId: string,
  questId: string,
  proofImageUrl?: string,
  latitude?: number,
  longitude?: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log('[completeQuest] Completing quest:', { userId, questId, latitude, longitude });

    // Use Supabase RPC to call database function
    const { data, error } = await supabase.rpc('complete_quest', {
      p_user_id: userId,
      p_quest_id: questId,
      p_proof_image_url: proofImageUrl || null,
      p_latitude: latitude || null,
      p_longitude: longitude || null
    });

    if (error) {
      console.error('[completeQuest] RPC error:', error);
      return { success: false, error: error.message || 'Failed to complete quest' };
    }

    console.log('[completeQuest] Quest completed successfully');
    return { success: true, message: 'Quest completed successfully' };
  } catch (error: any) {
    console.error('[completeQuest] Error:', error);
    return { success: false, error: error.message || 'Failed to complete quest' };
  }
}

/**
 * Get pending claims for user
 */
export async function getPendingClaims(userId: string): Promise<{ 
  success: boolean; 
  amount?: number; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('pending_claims')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[getPendingClaims] Error:', error);
      return { success: false, error: 'Failed to fetch pending claims' };
    }

    const amount = data?.total_amount || 0;
    return { success: true, amount: parseFloat(amount) };
  } catch (error: any) {
    console.error('[getPendingClaims] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch pending claims' };
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 100): Promise<{ 
  success: boolean; 
  users?: any[]; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, wallet_address, total_xp, level, quests_completed, total_tokens_earned, passport_tier')
      .order('total_xp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getLeaderboard] Error:', error);
      return { success: false, error: 'Failed to fetch leaderboard' };
    }

    return { success: true, users: data || [] };
  } catch (error: any) {
    console.error('[getLeaderboard] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch leaderboard' };
  }
}

/**
 * Upload proof image to Supabase Storage
 */
export async function uploadProofImage(
  userId: string,
  questId: string,
  imageFile: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${userId}/${questId}-${Date.now()}.${fileExt}`;
    const filePath = `quest-proofs/${fileName}`;

    const { data, error } = await supabase.storage
      .from('quest-images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[uploadProofImage] Error:', error);
      return { success: false, error: 'Failed to upload image' };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('quest-images')
      .getPublicUrl(filePath);

    return { success: true, url: urlData.publicUrl };
  } catch (error: any) {
    console.error('[uploadProofImage] Error:', error);
    return { success: false, error: error.message || 'Failed to upload image' };
  }
}

/**
 * Get achievements for user
 */
export async function getUserAchievements(userId: string): Promise<{ 
  success: boolean; 
  achievements?: any[]; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('[getUserAchievements] Error:', error);
      return { success: false, error: 'Failed to fetch achievements' };
    }

    return { success: true, achievements: data || [] };
  } catch (error: any) {
    console.error('[getUserAchievements] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch achievements' };
  }
}

/**
 * Check achievements for user (calls database function)
 */
export async function checkAchievements(userId: string): Promise<{ 
  success: boolean; 
  newAchievements?: any[]; 
  error?: string 
}> {
  try {
    const { data, error } = await supabase.rpc('check_achievements', {
      p_user_id: userId
    });

    if (error) {
      console.error('[checkAchievements] Error:', error);
      return { success: false, error: 'Failed to check achievements' };
    }

    return { success: true, newAchievements: data || [] };
  } catch (error: any) {
    console.error('[checkAchievements] Error:', error);
    return { success: false, error: error.message || 'Failed to check achievements' };
  }
}
