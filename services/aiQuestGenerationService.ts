import { supabase } from '../lib/supabase';

interface Attraction {
  name: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  place_id?: string;
  rating?: number;
  estimated_cost?: number;
  duration_hours?: number;
  type?: string;
}

interface TripContext {
  destination: string;
  duration: number;
  interests: string[];
  budget: string;
}

/**
 * Generate AI-powered quests for trip attractions
 * Uses Gemini AI to create engaging, contextual quest descriptions
 */
export async function generateTripQuests(
  attractions: Attraction[],
  tripContext: TripContext
): Promise<Array<{
  title: string;
  description: string;
  difficulty: number;
  reward_xp: number;
  reward_tokens: number;
}>> {
  try {
    // Call Supabase Edge Function for AI quest generation
    const { data, error } = await supabase.functions.invoke('generate-trip-quests', {
      body: {
        attractions,
        tripContext,
      },
    });

    if (error) {
      console.error('Error generating quests with AI:', error);
      // Fallback to simple quest generation
      return generateSimpleQuests(attractions);
    }

    return data?.quests || generateSimpleQuests(attractions);
  } catch (error) {
    console.error('Error in AI quest generation:', error);
    return generateSimpleQuests(attractions);
  }
}

/**
 * Fallback: Generate simple quests without AI
 */
function generateSimpleQuests(attractions: Attraction[]): Array<{
  title: string;
  description: string;
  difficulty: number;
  reward_xp: number;
  reward_tokens: number;
}> {
  return attractions.map((attraction) => {
    const rating = attraction.rating || 4.0;
    const difficulty = rating >= 4.5 ? 3 : rating >= 4.0 ? 2 : 1;
    const rewardXP = difficulty * 50 + Math.floor(rating * 20);
    const rewardTokens = difficulty * 15 + Math.floor(rating * 5);

    return {
      title: `Visit ${attraction.name}`,
      description: attraction.description || `Explore ${attraction.name} and capture your experience. Share your adventure with the TripX community!`,
      difficulty,
      reward_xp: rewardXP,
      reward_tokens: rewardTokens,
    };
  });
}

/**
 * Create quests in database from generated quest data
 * Only top 1/3 hardest quests get NFT rewards
 */
export async function createQuestsFromGenerated(
  userId: string,
  tripId: string,
  generatedQuests: Array<{
    title: string;
    description: string;
    difficulty: number;
    reward_xp: number;
    reward_tokens: number;
  }>,
  attractions: Attraction[],
  dayNumbers: number[]
): Promise<string[]> {
  console.log('💾 createQuestsFromGenerated CALLED');
  console.log('💾 userId:', userId);
  console.log('💾 tripId:', tripId);
  console.log('💾 generatedQuests length:', generatedQuests.length);
  console.log('💾 attractions length:', attractions.length);
  
  // Determine which quests get NFT rewards (top 1/3 hardest)
  const questsWithDifficulty = generatedQuests.map((q, i) => ({ ...q, index: i }));
  const sortedByDifficulty = [...questsWithDifficulty].sort((a, b) => b.difficulty - a.difficulty);
  const nftRewardCount = Math.max(1, Math.ceil(generatedQuests.length / 3)); // At least 1, or 1/3 of total
  const nftRewardIndices = new Set(sortedByDifficulty.slice(0, nftRewardCount).map(q => q.index));
  
  console.log(`💎 NFT rewards for ${nftRewardCount}/${generatedQuests.length} hardest quests`);
  
  const createdQuestIds: string[] = [];

  for (let i = 0; i < generatedQuests.length; i++) {
    const questData = generatedQuests[i];
    const attraction = attractions[i];
    const dayNumber = dayNumbers[i] || 1;
    console.log(`💾 [${i + 1}/${generatedQuests.length}] Creating: ${questData.title}`);

    if (!attraction || !attraction.coordinates) {
      console.log(`⚠️  Skipping quest ${i} - no attraction or coordinates`);
      continue;
    }

    try {
      // Check if this quest gets NFT reward (only top 1/3 hardest)
      const hasNftReward = nftRewardIndices.has(i);
      console.log(`💾 Inserting quest into database... (NFT reward: ${hasNftReward})`);
      
      const { data: quest, error } = await supabase
        .from('quests')
        .insert({
          title: questData.title,
          description: questData.description,
          location: attraction.name,
          latitude: attraction.coordinates.lat,
          longitude: attraction.coordinates.lng,
          difficulty: questData.difficulty,
          reward_xp: questData.reward_xp,
          reward_tokens: questData.reward_tokens,
          quest_type: 'standard',
          category: attraction.type === 'restaurant' ? 'food' : 
                    attraction.type === 'museum' ? 'culture' : 
                    attraction.type === 'park' ? 'nature' : 'culture',
          creator_id: userId,
          is_active: true,
          nft_reward: hasNftReward, // Only top 1/3 hardest quests get NFT rewards
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error creating quest:`, error);
      }

      if (!error && quest) {
        console.log(`✅ Quest created successfully: ${quest.id}`);
        createdQuestIds.push(quest.id);

        // Link quest to trip
        console.log(`🔗 Linking quest to trip...`);
        await supabase.from('trip_quests').insert({
          trip_id: tripId,
          quest_id: quest.id,
          day_number: dayNumber,
          order_in_day: i + 1,
        });

        // Auto-assign quest to user (so it appears in My Quests)
        try {
          console.log(`👤 Auto-assigning quest to user ${userId}...`);
          const { error: assignError } = await supabase.from('user_quests').insert({
            user_id: userId,
            quest_id: quest.id,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
          if (assignError) {
            console.error(`❌ Could not auto-assign quest:`, assignError);
          } else {
            console.log(`✅ Auto-assigned quest "${quest.title}" to user`);
          }
        } catch (assignError) {
          console.error(`⚠️  Could not auto-assign quest to user:`, assignError);
        }
      }
    } catch (err) {
      console.error(`❌ Error creating quest: ${questData.title}`, err);
    }
  }

  console.log(`🏁 createQuestsFromGenerated DONE: ${createdQuestIds.length} quests created`);
  return createdQuestIds;
}

