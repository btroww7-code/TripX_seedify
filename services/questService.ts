import { supabase } from '../lib/supabase';
import { UserQuest } from '../lib/supabase';
import { updateUserXP, incrementQuestsCompleted } from './userService';
import { updateLeaderboard } from './leaderboardService';
import { checkAchievements } from './achievementService';

/**
 * GPS Verification Service
 * Handles GPS geofencing, real-time tracking, and anti-spoofing measures
 */

// Default verification radius in meters
const DEFAULT_VERIFICATION_RADIUS = 100; // 100 meters
const AUTO_COMPLETE_TIME = 30000; // 30 seconds in milliseconds
const MIN_GPS_ACCURACY = 50; // Reject if accuracy > 50m

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user is within quest verification radius
 */
export function isWithinQuestRadius(
  userLat: number,
  userLon: number,
  questLat: number,
  questLon: number,
  radius: number = DEFAULT_VERIFICATION_RADIUS
): boolean {
  const distance = calculateHaversineDistance(userLat, userLon, questLat, questLon);
  return distance <= radius;
}

/**
 * Get real-time distance to quest location
 */
export function getDistanceToQuest(
  userLat: number,
  userLon: number,
  questLat: number,
  questLon: number
): { distance: number; distanceText: string; inRange: boolean; radius: number } {
  const distance = calculateHaversineDistance(userLat, userLon, questLat, questLon);
  const radius = DEFAULT_VERIFICATION_RADIUS;
  const inRange = distance <= radius;

  let distanceText: string;
  if (distance < 1000) {
    distanceText = `${Math.round(distance)}m`;
  } else {
    distanceText = `${(distance / 1000).toFixed(2)}km`;
  }

  return { distance, distanceText, inRange, radius };
}

/**
 * Check GPS accuracy and detect mock locations (anti-spoofing)
 */
export function validateGPSPosition(
  position: GeolocationPosition,
  previousPosition?: GeolocationPosition
): { valid: boolean; reason?: string; accuracy?: number } {
  // Check GPS accuracy
  if (position.coords.accuracy > MIN_GPS_ACCURACY) {
    return {
      valid: false,
      reason: `GPS accuracy too low: ${Math.round(position.coords.accuracy)}m (required: <${MIN_GPS_ACCURACY}m)`,
      accuracy: position.coords.accuracy,
    };
  }

  // Check timestamp freshness (must be within last 30 seconds)
  const now = Date.now();
  const positionTime = position.timestamp;
  const age = (now - positionTime) / 1000; // age in seconds

  if (age > 30) {
    return {
      valid: false,
      reason: `GPS data too old: ${Math.round(age)}s (required: <30s)`,
    };
  }

  // Check for mock location (Android)
  // Mock locations typically have accuracy = 0 or very high altitude
  if (position.coords.accuracy === 0 && !position.coords.altitude) {
    return {
      valid: false,
      reason: 'Possible mock location detected (accuracy = 0)',
    };
  }

  // Check for unrealistic speed (if previous position available)
  if (previousPosition) {
    const timeDiff = (position.timestamp - previousPosition.timestamp) / 1000; // seconds
    const distance = calculateHaversineDistance(
      previousPosition.coords.latitude,
      previousPosition.coords.longitude,
      position.coords.latitude,
      position.coords.longitude
    );
    const speed = distance / timeDiff; // m/s

    // If speed > 50 m/s (180 km/h), likely spoofed
    if (speed > 50 && timeDiff < 5) {
      return {
        valid: false,
        reason: `Unrealistic speed detected: ${(speed * 3.6).toFixed(1)} km/h`,
      };
    }
  }

  return { valid: true, accuracy: position.coords.accuracy };
}

/**
 * Request location permission and get current position
 */
export async function getCurrentPosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0, // Always get fresh position
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const validation = validateGPSPosition(position);
        if (!validation.valid) {
          reject(new Error(validation.reason || 'Invalid GPS position'));
          return;
        }
        resolve(position);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
}

/**
 * Watch position for real-time tracking
 * Returns a watch ID that can be used with clearWatch
 */
export function watchPosition(
  callback: (position: GeolocationPosition) => void,
  errorCallback?: (error: GeolocationPositionError) => void,
  options?: PositionOptions
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000, // Accept positions up to 5 seconds old
    ...options,
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      const validation = validateGPSPosition(position);
      if (validation.valid) {
        callback(position);
      } else if (errorCallback) {
        errorCallback({
          code: 0,
          message: validation.reason || 'Invalid GPS position',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
    },
    errorCallback,
    defaultOptions
  );
}

/**
 * Auto-complete quest when user is in range for specified duration
 */
export async function startAutoCompleteTimer(
  questId: string,
  questLat: number,
  questLon: number,
  radius: number = DEFAULT_VERIFICATION_RADIUS,
  onComplete: () => void,
  onDistanceUpdate?: (distance: number, inRange: boolean) => void
): Promise<() => void> {
  let watchId: number | null = null;
  let inRangeStartTime: number | null = null;
  let autoCompleteTimer: NodeJS.Timeout | null = null;
  let lastPosition: GeolocationPosition | null = null;

  const checkPosition = (position: GeolocationPosition) => {
    const validation = validateGPSPosition(position, lastPosition);
    if (!validation.valid) {
      return; // Skip invalid positions
    }

    lastPosition = position;

    const { distance, inRange } = getDistanceToQuest(
      position.coords.latitude,
      position.coords.longitude,
      questLat,
      questLon
    );

    if (onDistanceUpdate) {
      onDistanceUpdate(distance, inRange);
    }

    if (inRange) {
      if (inRangeStartTime === null) {
        inRangeStartTime = Date.now();
      }

      const timeInRange = Date.now() - inRangeStartTime;

      if (timeInRange >= AUTO_COMPLETE_TIME) {
        // User has been in range for 30 seconds, auto-complete
        onComplete();
        stopTracking();
      }
    } else {
      // User left the range, reset timer
      inRangeStartTime = null;
      if (autoCompleteTimer) {
        clearTimeout(autoCompleteTimer);
        autoCompleteTimer = null;
      }
    }
  };

  const errorHandler = (error: GeolocationPositionError) => {
    console.error('GPS tracking error:', error);
  };

  watchId = watchPosition(checkPosition, errorHandler);

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (autoCompleteTimer) {
      clearTimeout(autoCompleteTimer);
      autoCompleteTimer = null;
    }
    inRangeStartTime = null;
  };

  return stopTracking;
}

export async function uploadQuestPhoto(
  userId: string,
  questId: string,
  photoFile: File,
  latitude?: number,
  longitude?: number
): Promise<string> {
  // Upload to Supabase Storage
  const fileExt = photoFile.name.split('.').pop();
  const fileName = `${userId}/${questId}-${Date.now()}.${fileExt}`;
  const filePath = `quest-proofs/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('quest-proofs')
    .upload(filePath, photoFile, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload photo: ${uploadError.message}`);
  }

  // Get public URL
  const { data } = supabase.storage.from('quest-proofs').getPublicUrl(filePath);

  // Update user_quests with photo URL and GPS
  const { error: updateError } = await supabase
    .from('user_quests')
    .update({
      proof_image_url: data.publicUrl,
      latitude: latitude || null,
      longitude: longitude || null,
      status: 'in_progress',
    })
    .eq('user_id', userId)
    .eq('quest_id', questId);

  if (updateError) {
    throw new Error(`Failed to update quest: ${updateError.message}`);
  }

  return data.publicUrl;
}

export async function updateQuestVerification(
  userId: string,
  questId: string,
  verificationResult: {
    verified: boolean;
    confidence: number;
    reason: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('user_quests')
    .update({
      verification_result: verificationResult,
      ai_confidence: verificationResult.confidence,
      status: verificationResult.verified ? 'verified' : 'rejected',
      completed_at: verificationResult.verified ? new Date().toISOString() : null,
    })
    .eq('user_id', userId)
    .eq('quest_id', questId);

  if (error) {
    throw new Error(`Failed to update verification: ${error.message}`);
  }

  // If verified, update user stats
  if (verificationResult.verified) {
    const { data: userQuest } = await supabase
      .from('user_quests')
      .select('quests(reward_xp, reward_tokens)')
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .single();

    if (userQuest && userQuest.quests) {
      const questData = userQuest.quests as any;
      const xpGain = questData.reward_xp || 0;

      // Update user XP and level
      await updateUserXP(userId, xpGain);

      // Increment quests completed
      await incrementQuestsCompleted(userId);

      // Update tokens earned (not claimed yet)
      const { data: user } = await supabase
        .from('users')
        .select('total_tokens_earned')
        .eq('id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({
            total_tokens_earned: (parseFloat(user.total_tokens_earned?.toString() || '0') + parseFloat(questData.reward_tokens?.toString() || '0')).toString(),
          })
          .eq('id', userId);
      }

      // Update leaderboard
      await updateLeaderboard(userId);

      // Update achievement progress and check achievements
      const { updateAllAchievementProgress, checkAchievements } = await import('./achievementService');
      await updateAllAchievementProgress(userId);
      await checkAchievements(userId);
    }
  }
}

export async function getUserQuests(userId: string) {
  const { data, error } = await supabase
    .from('user_quests')
    .select(`
      *,
      quests (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user quests:', error);
    return [];
  }

  return data || [];
}

export async function deleteUserQuest(userQuestId: string, userId: string): Promise<void> {
  const { data: userQuest, error: fetchError } = await supabase
    .from('user_quests')
    .select('user_id')
    .eq('id', userQuestId)
    .single();

  if (fetchError) {
    throw new Error(`Quest not found: ${fetchError.message}`);
  }

  if (userQuest.user_id !== userId) {
    throw new Error('You do not have permission to delete this quest');
  }

  const { error: deleteError } = await supabase
    .from('user_quests')
    .delete()
    .eq('id', userQuestId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Failed to delete quest: ${deleteError.message}`);
  }
}

export interface QuestCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty: number;
  reward_tokens: number;
  reward_xp: number;
  quest_type: string;
  sponsor_name?: string;
  creator_id?: string;
  category_id?: string;
  tags?: string[];
  completion_requirements?: Record<string, any>;
  verification_type?: string;
  min_level?: number;
  max_completions?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface QuestFilters {
  category?: string;
  difficulty?: number[];
  minReward?: number;
  maxReward?: number;
  tags?: string[];
  questType?: string[];
  search?: string;
  userLocation?: { lat: number; lng: number };
  maxDistance?: number;
  userLevel?: number;
}

export async function getQuestCategories(): Promise<QuestCategory[]> {
  const { data, error } = await supabase
    .from('quest_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function getQuests(filters?: QuestFilters): Promise<Quest[]> {
  let query = supabase
    .from('quests')
    .select(`
      *,
      quest_categories (
        name,
        slug,
        color,
        icon
      )
    `)
    .eq('is_active', true);

  if (filters?.category) {
    const { data: category } = await supabase
      .from('quest_categories')
      .select('id')
      .eq('slug', filters.category)
      .maybeSingle();

    if (category) {
      query = query.eq('category_id', category.id);
    }
  }

  if (filters?.difficulty && filters.difficulty.length > 0) {
    query = query.in('difficulty', filters.difficulty);
  }

  if (filters?.minReward) {
    query = query.gte('reward_tokens', filters.minReward);
  }

  if (filters?.maxReward) {
    query = query.lte('reward_tokens', filters.maxReward);
  }

  if (filters?.questType && filters.questType.length > 0) {
    query = query.in('quest_type', filters.questType);
  }

  if (filters?.userLevel) {
    query = query.lte('min_level', filters.userLevel);
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    return [];
  }

  let quests = data || [];

  if (filters?.tags && filters.tags.length > 0) {
    quests = quests.filter(quest =>
      quest.tags && filters.tags!.some(tag => quest.tags!.includes(tag))
    );
  }

  if (filters?.userLocation && filters?.maxDistance) {
    quests = quests.filter(quest => {
      const distance = calculateHaversineDistance(
        filters.userLocation!.lat,
        filters.userLocation!.lng,
        quest.latitude,
        quest.longitude
      );
      return distance <= filters.maxDistance! * 1000;
    });
  }

  return quests;
}

/**
 * Get all global permanent quests
 */
export async function getGlobalQuests(): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('is_permanent', true)
    .eq('is_active', true)
    .order('reward_xp', { ascending: false });

  if (error) {
    console.error('Error fetching global quests:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's trip-specific quests
 */
export async function getTripQuests(userId: string, tripId?: string): Promise<Quest[]> {
  // First get user's trips
  const { data: userTrips, error: tripsError } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId);

  if (tripsError || !userTrips || userTrips.length === 0) {
    return [];
  }

  const tripIds = tripId ? [tripId] : userTrips.map(t => t.id);

  // Then get quests for those trips
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('is_permanent', false)
    .eq('is_active', true)
    .in('trip_id', tripIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trip quests:', error);
    return [];
  }

  return data || [];
}

export async function getQuestById(questId: string): Promise<Quest | null> {
  console.log('[getQuestById] Fetching quest:', questId);
  
  // First try simple select without JOIN
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('id', questId)
    .maybeSingle();

  if (error) {
    console.error('[getQuestById] Error fetching quest:', error);
    return null;
  }
  
  if (!data) {
    console.warn('[getQuestById] No quest found with ID:', questId);
    return null;
  }
  
  console.log('[getQuestById] Quest found:', { id: data.id, title: data.title });

  return data;
}

export async function createQuest(quest: Partial<Quest>, userId: string): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .insert({
      ...quest,
      creator_id: userId,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create quest: ${error.message}`);
  }

  return data;
}

export async function updateQuest(questId: string, updates: Partial<Quest>, userId: string): Promise<Quest> {
  const { data: quest } = await supabase
    .from('quests')
    .select('creator_id')
    .eq('id', questId)
    .maybeSingle();

  if (!quest || quest.creator_id !== userId) {
    throw new Error('You do not have permission to update this quest');
  }

  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', questId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update quest: ${error.message}`);
  }

  return data;
}

export async function deleteQuest(questId: string, userId: string): Promise<void> {
  const { data: quest } = await supabase
    .from('quests')
    .select('creator_id')
    .eq('id', questId)
    .maybeSingle();

  if (!quest || quest.creator_id !== userId) {
    throw new Error('You do not have permission to delete this quest');
  }

  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', questId);

  if (error) {
    throw new Error(`Failed to delete quest: ${error.message}`);
  }
}

export function calculateQuestDifficulty(
  userLevel: number,
  questDifficulty: number,
  distance: number
): {
  scaledDifficulty: number;
  rewardMultiplier: number;
  estimatedTime: number;
  recommendedFor: string;
} {
  const levelDiff = questDifficulty - userLevel;

  const distanceFactor = Math.min(distance / 1000, 10) / 10;

  let scaledDifficulty = questDifficulty + levelDiff * 0.2 + distanceFactor * questDifficulty * 0.1;
  scaledDifficulty = Math.max(1, Math.min(10, scaledDifficulty));

  let rewardMultiplier = 1.0;
  if (levelDiff > 2) {
    rewardMultiplier = 1 + (levelDiff - 2) * 0.15;
  } else if (levelDiff < -2) {
    rewardMultiplier = Math.max(0.5, 1 + levelDiff * 0.1);
  }

  const baseTime = questDifficulty * 15;
  const distanceTime = (distance / 1000) * 12;
  const estimatedTime = Math.round(baseTime + distanceTime);

  let recommendedFor: string;
  if (Math.abs(levelDiff) <= 1) {
    recommendedFor = 'Perfect Match';
  } else if (levelDiff > 1 && levelDiff <= 3) {
    recommendedFor = 'Challenging';
  } else if (levelDiff > 3) {
    recommendedFor = 'Very Hard';
  } else if (levelDiff < -1 && levelDiff >= -3) {
    recommendedFor = 'Easy';
  } else {
    recommendedFor = 'Too Easy';
  }

  return {
    scaledDifficulty: Math.round(scaledDifficulty * 10) / 10,
    rewardMultiplier: Math.round(rewardMultiplier * 100) / 100,
    estimatedTime,
    recommendedFor,
  };
}

export async function startQuest(userId: string, questId: string): Promise<void> {
  console.log('[startQuest] Starting quest:', { userId, questId });
  
  const quest = await getQuestById(questId);
  console.log('[startQuest] Quest lookup result:', quest ? { id: quest.id, title: quest.title } : 'null');
  
  if (!quest) {
    console.error('[startQuest] Quest not found in database:', questId);
    throw new Error('Quest not found');
  }

  const { data: user } = await supabase
    .from('users')
    .select('level')
    .eq('id', userId)
    .maybeSingle();

  console.log('[startQuest] User level:', user?.level, 'Required:', quest.min_level);

  if (user && quest.min_level && user.level < quest.min_level) {
    throw new Error(`You need to be level ${quest.min_level} to start this quest`);
  }

  const { data: existing } = await supabase
    .from('user_quests')
    .select('id')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .maybeSingle();

  if (existing) {
    console.log('[startQuest] Quest already started');
    throw new Error('You have already started this quest');
  }

  console.log('[startQuest] Inserting into user_quests...');
  const { error } = await supabase
    .from('user_quests')
    .insert({
      user_id: userId,
      quest_id: questId,
      status: 'in_progress',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[startQuest] Insert error:', error);
    throw new Error(`Failed to start quest: ${error.message}`);
  }
  
  console.log('[startQuest] Quest started successfully!');
}

/**
 * Check if quest has NFT reward
 */
export async function questHasNFTReward(questId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('quests')
    .select('nft_reward')
    .eq('id', questId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.nft_reward || false;
}

/**
 * Check if user has already minted NFT for a quest
 */
export async function hasMintedNFT(userId: string, questId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_quests')
    .select('nft_minted')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.nft_minted || false;
}

/**
 * Get NFT minting status for a user quest
 */
export async function getNFTMintingStatus(userId: string, questId: string): Promise<{
  nft_minted: boolean;
  nft_token_id?: number;
  nft_tx_hash?: string;
  nft_minted_at?: string;
}> {
  const { data, error } = await supabase
    .from('user_quests')
    .select('nft_minted, nft_token_id, nft_tx_hash, nft_minted_at')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .single();

  if (error || !data) {
    return { nft_minted: false };
  }

  return {
    nft_minted: data.nft_minted || false,
    nft_token_id: data.nft_token_id,
    nft_tx_hash: data.nft_tx_hash,
    nft_minted_at: data.nft_minted_at,
  };
}
