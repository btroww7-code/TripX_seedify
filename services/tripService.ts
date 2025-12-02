import { supabase } from '../lib/supabase';
import { Quest } from '../lib/supabase';

export interface TripData {
  destination: string;
  duration: number;
  interests: string[];
  budget: 'low' | 'medium' | 'high';
  quests: Array<Quest & { lat: number; lng: number; day: number }>;
}

export async function saveTripToSupabase(
  userId: string,
  tripData: TripData,
  baseCoords: { lat: number; lng: number },
  detailedPlan?: {
    hotels: any[];
    daily_plan: any[];
    total_estimated_cost: any;
    generated_quests?: any[];
    destination_info?: any;
    metadata?: any;
  }
): Promise<{ tripId: string; questIds: string[]; createdQuestIds: string[] }> {
  console.log('🚀 saveTripToSupabase CALLED');
  console.log('📍 userId:', userId);
  console.log('📍 tripData:', JSON.stringify(tripData, null, 2));
  console.log('📍 detailedPlan:', detailedPlan ? 'YES' : 'NO');
  if (detailedPlan?.daily_plan) {
    console.log('📍 daily_plan length:', detailedPlan.daily_plan.length);
    console.log('📍 daily_plan:', JSON.stringify(detailedPlan.daily_plan, null, 2));
  }
  
  // Extract country and city from destination or baseCoords
  const destinationParts = tripData.destination.split(',').map(s => s.trim());
  const city = destinationParts[0] || tripData.destination;
  const country = destinationParts[destinationParts.length - 1] || null;

  // Create trip with detailed plan in route_data
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      user_id: userId,
      destination: tripData.destination,
      duration_days: tripData.duration,
      interests: tripData.interests,
      budget: tripData.budget,
      status: 'active',
      latitude: baseCoords.lat,
      longitude: baseCoords.lng,
      country: country,
      city: city,
      total_cost: detailedPlan?.total_estimated_cost?.total || 0,
      route_data: detailedPlan ? {
        hotels: detailedPlan.hotels,
        daily_plan: detailedPlan.daily_plan,
        total_estimated_cost: detailedPlan.total_estimated_cost,
        destination_info: detailedPlan.destination_info,
        metadata: detailedPlan.metadata,
      } : null,
    })
    .select()
    .single();

  if (tripError) {
    throw new Error(`Failed to create trip: ${tripError.message}`);
  }

  // Create trip-specific quests from attractions using AI generation
  const createdQuestIds: string[] = [];

  console.log('🎯 QUEST CREATION SECTION');
  console.log('🎯 detailedPlan exists?', !!detailedPlan);
  console.log('🎯 daily_plan exists?', !!detailedPlan?.daily_plan);
  console.log('🎯 daily_plan length:', detailedPlan?.daily_plan?.length);

  if (detailedPlan?.daily_plan && detailedPlan.daily_plan.length > 0) {
    console.log(`🎯 Creating AI-generated quests from ${detailedPlan.daily_plan.length} days...`);

    try {
      // Import AI quest generation service
      const { generateTripQuests, createQuestsFromGenerated } = await import('./aiQuestGenerationService');

      // Collect all attractions with their day numbers
      const allAttractions: Array<{ attraction: any; dayNumber: number }> = [];
      console.log('🔍 Collecting attractions from daily_plan...');
      for (let dayIdx = 0; dayIdx < detailedPlan.daily_plan.length; dayIdx++) {
        const day = detailedPlan.daily_plan[dayIdx];
        const attractions = day.attractions || [];
        const dayNumber = day.day_number || (dayIdx + 1);
        console.log(`🔍 Day ${dayNumber}: ${attractions.length} attractions`);

        for (const attraction of attractions) {
          console.log(`  🏛️ ${attraction.name}: place_id=${!!attraction.place_id}, coords=${!!attraction.coordinates}`);
          if (attraction.place_id && attraction.coordinates) {
            allAttractions.push({ attraction, dayNumber });
          } else {
            console.log(`  ⚠️  Skipping ${attraction.name} - missing place_id or coordinates`);
          }
        }
      }
      console.log(`🔍 Total attractions collected: ${allAttractions.length}`);

      if (allAttractions.length > 0) {
        console.log(`✨ Calling AI quest generation for ${allAttractions.length} attractions...`);
        // Generate quests using AI
        const generatedQuests = await generateTripQuests(
          allAttractions.map(a => a.attraction),
          {
            destination: tripData.destination,
            duration: tripData.duration,
            interests: tripData.interests || [],
            budget: tripData.budget,
          }
        );

        console.log(`✨ AI generated ${generatedQuests?.length || 0} quests`);
        // Create quests in database
        console.log('💾 Creating quests in database...');
        const questIds = await createQuestsFromGenerated(
          userId,
          trip.id,
          generatedQuests,
          allAttractions.map(a => a.attraction),
          allAttractions.map(a => a.dayNumber)
        );

        createdQuestIds.push(...questIds);
        console.log(`✅ Created ${questIds.length} AI-generated quests for trip`);
      }
    } catch (error) {
      console.error('❌ Error in AI quest generation, falling back to simple quests:', error);
      console.log('🔄 FALLBACK MODE: Creating simple quests...');
      
      // Fallback to simple quest creation
      for (let dayIdx = 0; dayIdx < detailedPlan.daily_plan.length; dayIdx++) {
        const day = detailedPlan.daily_plan[dayIdx];
        const attractions = day.attractions || [];
        console.log(`🔄 Fallback Day ${dayIdx + 1}: ${attractions.length} attractions`);

        for (let attrIdx = 0; attrIdx < attractions.length; attrIdx++) {
          const attraction = attractions[attrIdx];
          console.log(`🔄 Processing: ${attraction.name}`);

          if (!attraction.place_id || !attraction.coordinates) {
            console.log(`⚠️  Skipping ${attraction.name} - missing data`);
            continue;
          }

          try {
            const difficulty = attraction.rating >= 4.5 ? 3 :
                             attraction.rating >= 4.0 ? 2 : 1;
            const rewardXP = difficulty * 50 + Math.floor((attraction.rating || 4) * 20);
            const rewardTokens = difficulty * 15 + Math.floor((attraction.rating || 4) * 5);

            const { data: quest, error: questError } = await supabase
              .from('quests')
              .insert({
                title: `Visit ${attraction.name}`,
                description: attraction.description || `Explore ${attraction.name} and capture your experience.`,
                location: attraction.name,
                latitude: attraction.coordinates.lat,
                longitude: attraction.coordinates.lng,
                difficulty,
                reward_xp: rewardXP,
                reward_tokens: rewardTokens,
                quest_type: 'standard',
                category: attraction.type === 'restaurant' ? 'food' : 
                          attraction.type === 'museum' ? 'culture' : 
                          attraction.type === 'park' ? 'nature' : 'culture',
                creator_id: userId,
                is_active: true,
              })
              .select()
              .single();

            if (!questError && quest) {
              console.log(`✅ Fallback quest created: ${quest.title} (${quest.id})`);
              createdQuestIds.push(quest.id);

              await supabase.from('trip_quests').insert({
                trip_id: trip.id,
                quest_id: quest.id,
                day_number: day.day_number || (dayIdx + 1),
                order_in_day: attrIdx + 1,
              });

              // Auto-assign quest to user (so it appears in My Quests)
              try {
                await supabase.from('user_quests').insert({
                  user_id: userId,
                  quest_id: quest.id,
                  status: 'pending',
                  created_at: new Date().toISOString(),
                });
                console.log(`✅ Auto-assigned fallback quest to user`);
              } catch (assignError) {
                console.error(`⚠️ Could not auto-assign fallback quest:`, assignError);
              }
            }
          } catch (err) {
            console.error(`Error creating fallback quest:`, err);
          }
        }
      }
    }
  }

  console.log(`✅ Trip created: ${trip.id} with ${detailedPlan?.daily_plan?.length || 0} days, ${createdQuestIds.length} quests`);

  // Update achievement progress after trip creation
  try {
    const { updateAllAchievementProgress, checkAchievements } = await import('./achievementService');
    await updateAllAchievementProgress(userId);
    await checkAchievements(userId);
  } catch (err) {
    console.error('Error updating achievements after trip creation:', err);
  }

  return {
    tripId: trip.id,
    questIds: createdQuestIds,
    createdQuestIds,
  };
}

export async function getUserTrips(userId: string) {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      user_quests (
        *,
        quests (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trips:', error);
    return [];
  }

  return data || [];
}

export async function getTripQuests(tripId: string) {
  const { data, error } = await supabase
    .from('user_quests')
    .select(`
      *,
      quests (*)
    `)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quests:', error);
    return [];
  }

  return data || [];
}

export async function updateTrip(tripId: string, userId: string, updates: {
  destination?: string;
  duration_days?: number;
  interests?: string[];
  budget?: string;
  status?: string;
  notes?: string;
  route_data?: any;
}) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTrip(tripId: string, userId: string) {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function markTripAsCompleted(tripId: string, userId: string, completionNotes?: string) {
  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: completionNotes
    })
    .eq('id', tripId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTripStatistics(userId: string) {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId);

  if (error || !trips) return null;

  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const totalDays = trips.reduce((sum, t) => sum + (t.duration_days || 0), 0);
  const totalCost = trips.reduce((sum, t) => sum + (t.total_cost || 0), 0);
  const countries = new Set(trips.map(t => t.country).filter(Boolean));
  const cities = new Set(trips.map(t => t.city).filter(Boolean));

  return {
    totalTrips,
    completedTrips,
    activeTrips: totalTrips - completedTrips,
    totalDays,
    totalCost,
    countriesVisited: countries.size,
    citiesVisited: cities.size,
    averageTripDuration: totalTrips > 0 ? totalDays / totalTrips : 0,
    averageTripCost: totalTrips > 0 ? totalCost / totalTrips : 0,
  };
}

export function exportTripToJSON(trip: any) {
  const exportData = {
    destination: trip.destination,
    duration: trip.duration_days,
    budget: trip.budget,
    interests: trip.interests,
    status: trip.status,
    created_at: trip.created_at,
    route_data: trip.route_data,
    notes: trip.notes,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trip-${trip.destination.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

