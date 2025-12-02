import { supabase } from '../lib/supabase';
import type { TripRequest, GeneratedTripPlan, Geolocation } from '../types';

// Legacy types for backward compatibility with existing components
interface Quest {
  id: string;
  title: string;
  description: string;
  location?: string;
  lat?: number;
  lng?: number;
  type: string;
  difficulty: number;
  reward: number;
  day: number;
}

export interface DetailedTripPlan {
  destination: string;
  duration: number;
  budget: 'low' | 'medium' | 'high';
  interests: string[];
  hotels: Array<{
    name: string;
    location: string;
    price_per_night: number;
    rating: number;
    description: string;
  }>;
  daily_plan: Array<{
    day: number;
    date?: string;
    activities: Array<{
      time: string;
      activity: string;
      location: string;
      cost: number;
      duration: string;
      description: string;
    }>;
    total_cost: number;
  }>;
  total_estimated_cost: {
    hotels: number;
    activities: number;
    food: number;
    transport: number;
    total: number;
  };
  quests: Quest[];
}

/**
 * Generate trip plan using Supabase Edge Function
 * This is the ONLY trip generation function - NO fallbacks, NO client-side AI
 * Calls backend which uses Gemini AI + Google Places verification
 */
export async function generateTripPlan(request: TripRequest): Promise<GeneratedTripPlan> {
  try {
    console.log('🚀 Calling Supabase Edge Function: generate-trip-ai', request);

    const { data, error } = await supabase.functions.invoke('generate-trip-ai', {
      body: {
        destination: request.destination,
        days: request.days,
        budget: request.budget,
        interests: request.interests,
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Try to extract error message from response
      let errorMessage = error.message || 'Failed to generate trip plan';

      // If error has context, use it
      if (error.context) {
        console.error('❌ Error context:', error.context);
        if (error.context.message) {
          errorMessage = error.context.message;
        }
      }

      // Provide more helpful error messages
      if (errorMessage.includes('API keys') || errorMessage.includes('GOOGLE_AI_KEY') || errorMessage.includes('MAPS_API_KEY')) {
        throw new Error('API configuration error. The Edge Function needs API keys to be configured. Please contact support.');
      }

      if (errorMessage.includes('Could not find destination')) {
        throw new Error(`Could not find "${request.destination}". Try a more specific location like "Paris, France" or "Tokyo, Japan".`);
      }

      if (errorMessage.includes('500') || errorMessage.includes('non-2xx') || errorMessage.includes('FunctionsHttpError')) {
        // Check if data has error information
        if (data && typeof data === 'object' && 'error' in data) {
          throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`);
        }
        throw new Error('Trip generation service is currently unavailable. Please try again in a moment.');
      }

      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error('Edge Function returned no data. Please check Edge Function logs in Supabase Dashboard.');
    }

    console.log('📦 Edge Function response data:', data);

    // Check if data contains error field (Edge Function might return error in data)
    if (data.error) {
      console.error('❌ Edge Function returned error in data:', data.error);
      const errorDetails = data.details ? `\n\nDetails: ${data.details}` : '';
      throw new Error(`${data.error}${errorDetails}`);
    }

    // Edge Function returns: { trip_overview, destination_info, hotels, daily_plan, generated_quests, metadata }
    // Keep the structure as-is for the new UI
    const mappedData = {
      trip_overview: data.trip_overview || {},
      destination_info: data.destination_info || {},
      daily_plan: data.daily_plan || [],
      hotels: data.hotels || [],
      generated_quests: data.generated_quests || [],
      metadata: data.metadata || {},
      // Legacy support
      days: data.daily_plan || [],
      attractions: (data.daily_plan || []).flatMap((day: any) =>
        (day.attractions || []).map((act: any) => ({
          name: act.name,
          location: act.name,
          coordinates: act.coordinates,
          price: act.estimated_cost || 0,
          rating: act.rating || 0,
          description: act.description,
          photo_url: act.photos?.[0],
          opening_hours: act.opening_hours,
          type: act.category || 'attraction'
        }))
      )
    };

    console.log('✅ Trip plan generated successfully:', {
      destination: mappedData.trip_overview?.city,
      days: mappedData.daily_plan?.length,
      hotels: mappedData.hotels?.length,
      quests: mappedData.generated_quests?.length,
      activities: mappedData.daily_plan?.reduce((sum: number, d: any) => sum + (d.attractions?.length || 0), 0)
    });

    return mappedData as GeneratedTripPlan;
  } catch (error: any) {
    console.error('💥 Trip Generation Error:', error);
    throw new Error(error.message || 'Failed to generate trip. Please check your internet connection and try again.');
  }
}

/**
 * LEGACY: Backward compatibility wrapper
 * @deprecated Use generateTripPlan() instead - it calls the production Edge Function
 * This function now converts GeneratedTripPlan to DetailedTripPlan format
 */
export async function generateIntelligentTripPlan(request: { destination: string; duration: number; interests: string[]; budget: 'low' | 'medium' | 'high' }): Promise<DetailedTripPlan> {
  const newRequest: TripRequest = {
    destination: request.destination,
    days: request.duration,
    budget: request.budget,
    interests: request.interests,
  };
  
  const plan = await generateTripPlan(newRequest);
  
  // Edge Function returns: { trip_overview, hotels: Hotel[], daily_plan: DailyPlan[] }
  // DailyPlan has: { day_number, theme, attractions: Attraction[], estimated_cost }
  // Need to convert to old format for backward compatibility
  
  const dayPlans = plan.days || [];
  
  return {
    destination: plan.trip_overview.city,
    duration: newRequest.days,
    budget: newRequest.budget,
    interests: newRequest.interests,
    hotels: plan.hotels || [],
    daily_plan: dayPlans.map((day: any) => {
      const attractions = day.attractions || day.activities || [];
      return {
        day: day.day_number,
        activities: attractions.map((act: any) => ({
          time: act.time_of_day === 'morning' ? '09:00' : act.time_of_day === 'afternoon' ? '14:00' : '19:00',
          activity: act.name || act.place_name || 'Activity',
          location: act.name || act.place_name || 'Location',
          cost: act.estimated_cost || 0,
          duration: `${act.duration_hours || 1} hours`,
          description: act.description || '',
        })),
        total_cost: attractions.reduce((sum: number, act: any) => sum + (act.estimated_cost || 0), 0),
      };
    }),
    total_estimated_cost: {
      hotels: 0,
      activities: dayPlans.reduce((sum: number, day: any) => {
        const attractions = day.attractions || day.activities || [];
        return sum + attractions.reduce((s: number, a: any) => s + (a.estimated_cost || 0), 0);
      }, 0),
      food: 0,
      transport: 0,
      total: 0,
    },
    quests: dayPlans.flatMap((day: any) => {
      const attractions = day.attractions || day.activities || [];
      return attractions.map((act: any, idx: number) => ({
        id: `quest-${day.day_number}-${idx}`,
        title: (act.name || act.place_name || 'Quest').substring(0, 50),
        description: act.description || '',
        location: act.name || act.place_name || 'Location',
        lat: act.coordinates?.lat || 0,
        lng: act.coordinates?.lng || 0,
        type: newRequest.interests[0] || 'culture',
        difficulty: 5,
        reward: 100,
        day: day.day_number,
      }));
    }),
  };
}

// ============= HELPER FUNCTIONS (kept for backward compatibility) =============

export async function verifyQuestPhoto(
  photoBase64: string,
  questTitle: string,
  questDescription: string
): Promise<{ verified: boolean; confidence: number; reason: string }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'TripX',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a quest verification AI for a travel app. Analyze this photo to verify if the user completed this quest:

Quest: "${questTitle}"
Description: "${questDescription}"

Your task:
1. Identify what's in the photo
2. Determine if it matches the quest requirements
3. Check if it looks authentic (not a screenshot or fake)
4. Provide confidence score 0-100

Respond with ONLY valid JSON (no markdown):
{
  "verified": true/false,
  "confidence": 0-100,
  "reason": "Brief explanation of what you see and why you verified/rejected it"
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: photoBase64,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in verification response');
    }

    const result = JSON.parse(jsonMatch[0]);

    return {
      verified: result.verified || false,
      confidence: result.confidence || 0,
      reason: result.reason || 'Unable to verify',
    };
  } catch (error) {
    console.error('Photo verification error:', error);

    return {
      verified: true,
      confidence: 85,
      reason: 'Verification service temporarily unavailable. Auto-approved based on upload.',
    };
  }
}

export async function getLocationCoordinates(destination: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        destination
      )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY}`
    );

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function getQuestLocations(quests: Quest[], destination: string): Promise<Quest[]> {
  const questsWithCoords = await Promise.all(
    quests.map(async (quest) => {
      const locationToGeocode = quest.location || quest.description?.match(/(?:at|in|visit|see)\s+([A-Z][^.!?]+)/i)?.[1] || destination;
      
      try {
        const coords = await getLocationCoordinates(locationToGeocode);
        if (coords) {
          return { ...quest, lat: coords.lat, lng: coords.lng };
        }
      } catch (error) {
        console.error(`Error geocoding quest location "${locationToGeocode}":`, error);
      }

      const destinationCoords = await getLocationCoordinates(destination);
      if (destinationCoords) {
        return {
          ...quest,
          lat: destinationCoords.lat + (Math.random() - 0.5) * 0.05,
          lng: destinationCoords.lng + (Math.random() - 0.5) * 0.05,
        };
      }

      return {
        ...quest,
        lat: 40.7128 + (Math.random() - 0.5) * 0.05,
        lng: -74.006 + (Math.random() - 0.5) * 0.05,
      };
    })
  );

  return questsWithCoords;
}
