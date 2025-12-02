import { supabase } from '../lib/supabase';

export interface QuestFilters {
  category?: string;
  difficulty?: number;
  minReward?: number;
  maxReward?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  quest_type?: string;
  is_active?: boolean;
  minLevel?: number;
  tags?: string[];
}

export interface QuestCreateData {
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty?: number;
  reward_tokens?: number;
  reward_xp?: number;
  quest_type?: string;
  category?: string;
  sponsor_name?: string;
  creator_id?: string;
  place_id?: string;
  place_name?: string;
  place_rating?: number;
  place_price_level?: number;
  place_photos?: string[];
  place_address?: string;
  place_website?: string;
  place_phone?: string;
  verification_radius?: number;
  image_url?: string;
  tags?: string[];
  min_level?: number;
  max_completions?: number;
  verification_type?: string;
}

/**
 * Quest Difficulty Scaling System
 * Calculates difficulty based on multiple factors
 */
export function calculateQuestDifficulty(params: {
  distance?: number;
  duration?: number;
  priceLevel?: number;
  rating?: number;
  complexity?: number;
}): number {
  let difficulty = 1;

  // Distance factor (km)
  if (params.distance) {
    if (params.distance > 50) difficulty += 3;
    else if (params.distance > 20) difficulty += 2;
    else if (params.distance > 5) difficulty += 1;
  }

  // Duration factor (hours)
  if (params.duration) {
    if (params.duration > 4) difficulty += 2;
    else if (params.duration > 2) difficulty += 1;
  }

  // Price level factor
  if (params.priceLevel) {
    difficulty += params.priceLevel;
  }

  // Rating factor (harder quests at better places)
  if (params.rating && params.rating > 4.5) {
    difficulty += 1;
  }

  // Custom complexity
  if (params.complexity) {
    difficulty += params.complexity;
  }

  return Math.min(Math.max(difficulty, 1), 10);
}

/**
 * Quest Reward Calculation System
 * Calculates rewards based on difficulty, rating, and other factors
 */
export function calculateQuestRewards(params: {
  difficulty: number;
  rating?: number;
  priceLevel?: number;
  duration?: number;
  isSponsored?: boolean;
  sponsorMultiplier?: number;
}): { tokens: number; xp: number } {
  const baseDifficulty = params.difficulty || 1;

  // Base rewards
  let tokens = baseDifficulty * 10;
  let xp = baseDifficulty * 50;

  // Rating bonus (up to +50%)
  if (params.rating) {
    const ratingMultiplier = params.rating / 5;
    tokens *= (1 + ratingMultiplier * 0.5);
    xp *= (1 + ratingMultiplier * 0.5);
  }

  // Price level bonus
  if (params.priceLevel) {
    tokens += params.priceLevel * 5;
    xp += params.priceLevel * 10;
  }

  // Duration bonus
  if (params.duration) {
    tokens += params.duration * 3;
    xp += params.duration * 15;
  }

  // Sponsored quest multiplier
  if (params.isSponsored && params.sponsorMultiplier) {
    tokens *= params.sponsorMultiplier;
    xp *= (params.sponsorMultiplier * 0.8);
  }

  return {
    tokens: Math.round(tokens),
    xp: Math.round(xp),
  };
}

/**
 * Create a new quest
 */
export async function createQuest(questData: QuestCreateData) {
  // Calculate difficulty if not provided
  const difficulty = questData.difficulty || calculateQuestDifficulty({
    priceLevel: questData.place_price_level,
    rating: questData.place_rating,
  });

  // Calculate rewards if not provided
  const rewards = calculateQuestRewards({
    difficulty,
    rating: questData.place_rating,
    priceLevel: questData.place_price_level,
  });

  const { data, error } = await supabase
    .from('quests')
    .insert({
      ...questData,
      difficulty,
      reward_tokens: questData.reward_tokens || rewards.tokens,
      reward_xp: questData.reward_xp || rewards.xp,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create quest: ${error.message}`);
  }

  return data;
}

/**
 * Get all quests with advanced filtering
 */
export async function getQuests(filters: QuestFilters = {}) {
  let query = supabase
    .from('quests')
    .select(`
      *,
      quest_categories (
        id,
        name,
        slug,
        icon,
        color
      )
    `);

  // Apply filters
  if (filters.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  } else {
    query = query.eq('is_active', true);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.minReward) {
    query = query.gte('reward_tokens', filters.minReward);
  }

  if (filters.maxReward) {
    query = query.lte('reward_tokens', filters.maxReward);
  }

  if (filters.quest_type) {
    query = query.eq('quest_type', filters.quest_type);
  }

  if (filters.minLevel) {
    query = query.lte('min_level', filters.minLevel);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch quests: ${error.message}`);
  }

  // Client-side filtering for location-based queries
  let filteredData = data || [];

  if (filters.latitude && filters.longitude && filters.radius) {
    filteredData = filteredData.filter((quest: any) => {
      const distance = calculateDistance(
        filters.latitude!,
        filters.longitude!,
        Number(quest.latitude),
        Number(quest.longitude)
      );
      return distance <= filters.radius!;
    });
  }

  return filteredData;
}

/**
 * Get a single quest by ID
 */
export async function getQuestById(questId: string) {
  const { data, error } = await supabase
    .from('quests')
    .select(`
      *,
      quest_categories (
        id,
        name,
        slug,
        icon,
        color
      )
    `)
    .eq('id', questId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch quest: ${error.message}`);
  }

  return data;
}

/**
 * Update a quest
 */
export async function updateQuest(questId: string, updates: Partial<QuestCreateData>) {
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

/**
 * Delete a quest (soft delete - set is_active to false)
 */
export async function deleteQuest(questId: string, hard: boolean = false) {
  if (hard) {
    const { error } = await supabase.from('quests').delete().eq('id', questId);

    if (error) {
      throw new Error(`Failed to delete quest: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from('quests')
      .update({ is_active: false })
      .eq('id', questId);

    if (error) {
      throw new Error(`Failed to deactivate quest: ${error.message}`);
    }
  }

  return true;
}

/**
 * Get quests by category
 */
export async function getQuestsByCategory(categorySlug: string) {
  const { data: category } = await supabase
    .from('quest_categories')
    .select('id')
    .eq('slug', categorySlug)
    .single();

  if (!category) {
    throw new Error(`Category not found: ${categorySlug}`);
  }

  return getQuests({ category: category.id });
}

/**
 * Get nearby quests
 */
export async function getNearbyQuests(lat: number, lng: number, radiusKm: number = 5) {
  return getQuests({
    latitude: lat,
    longitude: lng,
    radius: radiusKm * 1000, // Convert to meters
    is_active: true,
  });
}

/**
 * Search quests by text
 */
export async function searchQuests(searchText: string) {
  const { data, error } = await supabase
    .from('quests')
    .select(`
      *,
      quest_categories (
        id,
        name,
        slug,
        icon,
        color
      )
    `)
    .or(`title.ilike.%${searchText}%,description.ilike.%${searchText}%,location.ilike.%${searchText}%`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to search quests: ${error.message}`);
  }

  return data || [];
}

/**
 * Get quest statistics
 */
export async function getQuestStats(questId: string) {
  const { data, error } = await supabase
    .from('user_quests')
    .select('status, completed_at')
    .eq('quest_id', questId);

  if (error) {
    throw new Error(`Failed to fetch quest stats: ${error.message}`);
  }

  const total = data.length;
  const completed = data.filter((uq: any) => uq.status === 'completed').length;
  const inProgress = data.filter((uq: any) => uq.status === 'in_progress').length;
  const pending = data.filter((uq: any) => uq.status === 'pending').length;

  return {
    total_attempts: total,
    completed_count: completed,
    in_progress_count: inProgress,
    pending_count: pending,
    completion_rate: total > 0 ? (completed / total) * 100 : 0,
  };
}

/**
 * Haversine distance calculation (in meters)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get all quest categories
 */
export async function getQuestCategories() {
  const { data, error } = await supabase
    .from('quest_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return data || [];
}
