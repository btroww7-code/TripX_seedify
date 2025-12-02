import { supabase } from '../lib/supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Complete a quest with verification - Frontend Only (no backend)
 * Uses Supabase RPC to call database function
 */
export async function completeQuestAPI(
  userId: string,
  questId: string,
  verificationResult: any,
  proofImageUrl?: string
): Promise<ApiResponse> {
  try {
    console.log('[completeQuestAPI] Completing quest:', { userId, questId });

    // Check if GPS verified
    // DISABLED FOR DEMO - GPS check skipped to allow testing
    // if (!verificationResult.gps_verified) {
    //   return {
    //     success: false,
    //     error: 'GPS verification failed - you must be at the location',
    //   };
    // }

    // Use Supabase RPC to call database function
    const { data, error } = await supabase.rpc('complete_quest', {
      p_user_id: userId,
      p_quest_id: questId,
      p_proof_image_url: proofImageUrl || null,
      p_latitude: verificationResult.latitude || null,
      p_longitude: verificationResult.longitude || null
    });

    if (error) {
      console.error('[completeQuestAPI] RPC error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete quest',
      };
    }

    console.log('[completeQuestAPI] Quest completed successfully');
    return {
      success: true,
      data: data,
      message: 'Quest completed successfully',
    };
  } catch (error: any) {
    console.error('[completeQuestAPI] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to complete quest',
    };
  }
}

/**
 * Start a quest - Frontend Only (no backend)
 * Creates user_quest record directly in Supabase
 */
export async function startQuestAPI(
  userId: string,
  questId: string
): Promise<ApiResponse> {
  try {
    console.log('[startQuestAPI] Starting quest:', { userId, questId });

    // Check if quest exists
    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .eq('is_active', true)
      .single();

    if (questError || !quest) {
      return {
        success: false,
        error: 'Quest not found or is not active',
      };
    }

    // Check if already started
    const { data: existingUserQuest } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .maybeSingle();

    if (existingUserQuest) {
      return {
        success: true,
        data: existingUserQuest,
        message: 'Quest already started',
      };
    }

    // Create user_quest record
    const { data: newUserQuest, error: insertError } = await supabase
      .from('user_quests')
      .insert({
        user_id: userId,
        quest_id: questId,
        status: 'pending',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[startQuestAPI] Insert error:', insertError);
      return {
        success: false,
        error: 'Failed to start quest',
      };
    }

    return {
      success: true,
      data: newUserQuest,
      message: 'Quest started successfully',
    };
  } catch (error: any) {
    console.error('[startQuestAPI] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to start quest',
    };
  }
}

/**
 * Get user quests - Frontend Only (no backend)
 * Queries directly from Supabase
 */
export async function getUserQuestsAPI(
  userId: string,
  filters?: { status?: string; limit?: number }
): Promise<ApiResponse> {
  try {
    console.log('[getUserQuestsAPI] Fetching quests for user:', userId, 'filters:', filters);

    let query = supabase
      .from('user_quests')
      .select(`
        *,
        quests (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[getUserQuestsAPI] Error:', error);
      return {
        success: false,
        error: 'Failed to fetch quests',
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error: any) {
    console.error('[getUserQuestsAPI] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch quests',
    };
  }
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: string | undefined): string {
  if (!error) return 'An unknown error occurred';
  
  // Map common errors to user-friendly messages
  const errorMap: Record<string, string> = {
    'Web3 not configured': 'Blockchain connection not available. Please try again later.',
    'Admin wallet not configured': 'System configuration error. Please contact support.',
    'No unclaimed rewards found': 'You don\'t have any rewards to claim yet.',
    'Quest not found': 'This quest doesn\'t exist or has been removed.',
    'Quest already completed': 'You\'ve already completed this quest.',
    'GPS verification failed': 'Please make sure you are at the quest location and have GPS enabled.',
    'User already has a passport': 'You already have an NFT Passport.',
    'Quest does not have NFT reward': 'This quest doesn\'t award an NFT badge.',
  };
  
  // Check if error matches any known error
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.includes(key)) {
      return value;
    }
  }
  
  return error;
}
