/**
 * Google Places POI Service - Using NEW Google Places API (2025)
 * Migrated from deprecated PlacesService to new Place API
 */

import { loadGoogleMaps } from '../lib/googleMapsLoader';

export type InterestCategory = 'food' | 'culture' | 'nightlife' | 'shopping' | 'nature' | 'entertainment';
export type BudgetLevel = 'low' | 'medium' | 'high';

export interface PlaceWithDetails {
  id: string;
  place_id: string;
  name: string;
  type: string;
  rating: number;
  priceLevel?: number;
  address: string;
  location: { lat: number; lng: number };
  photos: string[];
  user_ratings_total: number;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  opening_hours?: {
    weekday_text?: string[];
    open_now?: boolean;
  };
}

export interface POI {
  id: string;
  name: string;
  type: string;
  rating?: number;
  priceLevel?: number;
  address: string;
  location: { lat: number; lng: number };
  photos?: string[];
  website?: string;
  phoneNumber?: string;
  openingHours?: string[];
}

export interface Hotel {
  id: string;
  name: string;
  rating?: number;
  priceLevel?: number;
  address: string;
  location: { lat: number; lng: number };
  photos?: string[];
  website?: string;
  phoneNumber?: string;
  price?: string;
}

/**
 * Get place types for interest category
 */
function getPlaceTypesForInterest(interest: string): string[] {
  const interestMap: Record<string, string[]> = {
    food: ['restaurant', 'cafe', 'food', 'meal_takeaway', 'bakery', 'meal_delivery'],
    culture: ['museum', 'art_gallery', 'church', 'library', 'tourist_attraction', 'stadium', 'zoo'],
    nightlife: ['bar', 'night_club', 'casino'],
    shopping: ['shopping_mall', 'store', 'clothing_store', 'supermarket'],
    nature: ['park', 'zoo', 'aquarium', 'campground'],
    entertainment: ['movie_theater', 'amusement_park', 'bowling_alley', 'stadium'],
  };

  return interestMap[interest.toLowerCase()] || ['tourist_attraction'];
}

/**
 * Search places using NEW Google Places API (Place.searchNearby)
 * Falls back to old API if new API is not available
 */
export async function searchPlacesByCategory(
  location: { lat: number; lng: number },
  interest: string,
  budget?: string,
  radius: number = 5000,
  limit: number = 20
): Promise<PlaceWithDetails[]> {
  try {
    await loadGoogleMaps();
    
    const google = (window as any).google;
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const placeTypes = getPlaceTypesForInterest(interest);
    const allPlaces: PlaceWithDetails[] = [];

    // Check if new Place API is available
    const useNewAPI = google.maps.places?.Place?.searchNearby !== undefined;

    console.log(`🔍 Using ${useNewAPI ? 'NEW' : 'OLD'} Google Places API`);

    // Search for each place type SEQUENTIALLY to avoid rate limits
    const searchPromises = placeTypes.map((type, index) => {
      return new Promise<PlaceWithDetails[]>((resolve) => {
        // Add delay between requests to avoid rate limiting
        setTimeout(async () => {
          console.log(`📍 Searching for type: ${type}`);

          // Timeout fallback - resolve with empty array after 15 seconds
          const timeoutId = setTimeout(() => {
            console.warn(`⏱️ Timeout for ${type} - resolving with empty array`);
            resolve([]);
          }, 15000);

          try {
            if (useNewAPI) {
              // NEW API: Place.searchNearby()
              await searchWithNewAPI(google, location, radius, type, timeoutId, resolve);
                      } else {
              // OLD API: PlacesService.nearbySearch (deprecated but still works)
              await searchWithOldAPI(google, location, radius, type, timeoutId, resolve);
            }
          } catch (error) {
            clearTimeout(timeoutId);
            console.error(`❌ Error searching for ${type}:`, error);
            resolve([]); // Always resolve, never reject
          }
        }, index * 300); // Stagger requests by 300ms each
      });
    });

    console.log(`🔄 Waiting for all ${searchPromises.length} search requests...`);
    const results = await Promise.all(searchPromises);
    console.log(`✅ All searches completed, processing ${results.length} result sets`);
    
    results.forEach((places, index) => {
      if (Array.isArray(places) && places.length > 0) {
        console.log(`  → Result set ${index + 1}: ${places.length} places`);
        allPlaces.push(...places);
      }
    });

    // Remove duplicates by place_id
    const uniquePlaces = Array.from(
      new Map(allPlaces.map(place => [place.place_id, place])).values()
    );

    // Sort by rating × reviews (quality score)
    uniquePlaces.sort((a, b) => {
      const scoreA = (a.rating || 0) * (a.user_ratings_total || 0);
      const scoreB = (b.rating || 0) * (b.user_ratings_total || 0);
      return scoreB - scoreA;
    });

    // Limit results
    const limitedPlaces = uniquePlaces.slice(0, limit);
    console.log(`✅ Total unique places found: ${limitedPlaces.length}`);

    return limitedPlaces;
  } catch (error) {
    console.error('❌ Error in searchPlacesByCategory:', error);
    return [];
  }
}

/**
 * Search using NEW Google Places API (Place.searchNearby)
 */
async function searchWithNewAPI(
  google: any,
  location: { lat: number; lng: number },
  radius: number,
  type: string,
  timeoutId: NodeJS.Timeout,
  resolve: (value: PlaceWithDetails[]) => void
): Promise<void> {
  try {
    const request = {
      locationRestriction: {
        circle: {
          center: { lat: location.lat, lng: location.lng },
          radius: radius,
        },
      },
      includedTypes: [type],
      maxResultCount: 20,
      languageCode: 'en',
    };

    // Check if Place.searchNearby is available
    if (!google.maps.places?.Place?.searchNearby) {
      throw new Error('New Place.searchNearby API not available');
    }
    
    const { Place } = google.maps.places;
    
    // Use new Place.searchNearby() API
    const response = await Place.searchNearby(request);

    clearTimeout(timeoutId);

    if (response && response.places && response.places.length > 0) {
      const places: PlaceWithDetails[] = response.places
        .filter((place: any) => {
          try {
            const rating = place.rating || 0;
            const reviewsCount = place.userRatingsCount || 0;
            return rating >= 3.0 && reviewsCount >= 10 && place.location;
          } catch (e) {
            return false;
          }
        })
        .map((place: any) => {
          try {
            return {
              id: place.id || place.placeId || '',
              place_id: place.id || place.placeId || '',
              name: place.displayName?.text || place.name || '',
              type: type,
              rating: place.rating || 0,
              priceLevel: place.priceLevel || undefined,
              address: place.formattedAddress || place.address || '',
              location: {
                lat: place.location?.latitude || 0,
                lng: place.location?.longitude || 0,
              },
              photos: place.photos?.slice(0, 3).map((photo: any) => 
                photo.getURI?.({ maxWidth: 400, maxHeight: 300 }) || ''
              ) || [],
              user_ratings_total: place.userRatingsCount || 0,
            };
          } catch (e) {
            console.warn('Error mapping place (new API):', e);
            return null;
          }
        })
        .filter((place): place is PlaceWithDetails => place !== null);
      
      console.log(`✅ Found ${places.length} places for type: ${type} (NEW API)`);
      resolve(places);
    } else {
      console.log(`⚠️ No results for type: ${type} (NEW API)`);
      resolve([]);
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`❌ Error with NEW API for ${type}:`, error);
    // Fallback to old API
    console.log(`🔄 Falling back to OLD API for ${type}...`);
    await searchWithOldAPI(google, location, radius, type, timeoutId, resolve);
  }
}

/**
 * Search using OLD Google Places API (PlacesService.nearbySearch)
 * This is deprecated but still works for existing customers
 */
async function searchWithOldAPI(
  google: any,
  location: { lat: number; lng: number },
  radius: number,
  type: string,
  timeoutId: NodeJS.Timeout,
  resolve: (value: PlaceWithDetails[]) => void
): Promise<void> {
  try {
    // Create a dummy div for PlacesService (required by old API)
    const serviceDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(serviceDiv);

    const nearbyRequest = {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: radius,
      type: [type],
      language: 'en',
    };

    // Wrap in Promise to handle callback properly
    const places = await new Promise<PlaceWithDetails[]>((innerResolve) => {
      // Inner timeout for callback
      const callbackTimeout = setTimeout(() => {
        console.warn(`⏱️ Callback timeout for ${type}`);
        innerResolve([]);
      }, 12000);

      try {
        service.nearbySearch(nearbyRequest, (results: any[], status: any) => {
          clearTimeout(callbackTimeout);
          clearTimeout(timeoutId);
          
          try {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              const mappedPlaces: PlaceWithDetails[] = results
                .filter((place: any) => {
                  try {
                    const rating = place.rating || 0;
                    const reviewsCount = place.user_ratings_total || 0;
                    return rating >= 3.0 && reviewsCount >= 10 && place.geometry && place.geometry.location;
                  } catch (e) {
                    return false;
                  }
                })
                .map((place: any) => {
                  try {
                    return {
                      id: place.place_id,
                      place_id: place.place_id,
                      name: place.name,
                      type: type,
                      rating: place.rating || 0,
                      priceLevel: place.price_level,
                      address: place.vicinity || place.formatted_address || '',
                      location: {
                        lat: typeof place.geometry.location.lat === 'function' 
                          ? place.geometry.location.lat() 
                          : place.geometry.location.lat,
                        lng: typeof place.geometry.location.lng === 'function'
                          ? place.geometry.location.lng()
                          : place.geometry.location.lng,
                      },
                      photos: place.photos?.slice(0, 3).map((photo: any) => 
                        photo.getUrl?.({ maxWidth: 400, maxHeight: 300 }) || ''
                      ) || [],
                      user_ratings_total: place.user_ratings_total || 0,
                    };
                  } catch (e) {
                    console.warn('Error mapping place (old API):', e);
                    return null;
                  }
                })
                .filter((place) => {
                  if (!place) return false;
                  return !!(place.id && place.place_id && place.name && place.type && place.location && typeof place.rating === 'number' && typeof place.user_ratings_total === 'number');
                })
                .map((place) => place as PlaceWithDetails);
              
              console.log(`✅ Found ${mappedPlaces.length} places for type: ${type} (OLD API)`);
              innerResolve(mappedPlaces);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.log(`⚠️ No results for type: ${type} (OLD API)`);
              innerResolve([]);
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
              console.warn(`⚠️ Query limit reached for ${type} - will retry later`);
              innerResolve([]);
            } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              console.error(`❌ REQUEST_DENIED for ${type} - check API key permissions`);
              innerResolve([]);
            } else {
              console.warn(`⚠️ Places API error status for ${type}: ${status}`);
              innerResolve([]);
            }
          } catch (callbackError) {
            console.error(`❌ Error in nearbySearch callback for ${type}:`, callbackError);
            innerResolve([]);
          }
        });
      } catch (searchError) {
        clearTimeout(callbackTimeout);
        clearTimeout(timeoutId);
        console.error(`❌ Error calling nearbySearch for ${type}:`, searchError);
        innerResolve([]);
      }
    });

    resolve(places);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`❌ Error setting up nearbySearch for ${type}:`, error);
    resolve([]);
  }
}

/**
 * Get places by interest category
 */
export async function getPlacesByInterest(
  location: { lat: number; lng: number },
  interests: string | string[],
  budget?: string,
  radius: number = 5000,
  limitPerCategory: number = 10
): Promise<PlaceWithDetails[]> {
  const allPlaces: PlaceWithDetails[] = [];
  
  // Normalize to array
  const interestsList = typeof interests === 'string' ? [interests] : interests;

  for (const interest of interestsList) {
    try {
      const places = await searchPlacesByCategory(location, interest, budget, radius, limitPerCategory);
      allPlaces.push(...places);
      } catch (error) {
      console.error(`Error fetching places for interest ${interest}:`, error);
      // Continue with other interests
    }
  }

  // Remove duplicates
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(place => [place.place_id, place])).values()
  );

  return uniquePlaces;
}

/**
 * Get detailed information about a place by place_id
 * Uses NEW Google Places API (Place.fetchFields) with fallback to old API
 */
export async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    await loadGoogleMaps();
    
    const google = (window as any).google;
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    // Check if new Place API is available
    const useNewAPI = google.maps.places?.Place?.fetchFields !== undefined;

    if (useNewAPI) {
      // NEW API: Place.fetchFields()
      try {
        const { Place } = google.maps.places;
        const place = new Place({ id: placeId });
        
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'priceLevel',
            'photos',
            'reviews',
            'openingHours',
            'websiteURI',
            'nationalPhoneNumber',
          ],
        });

        return {
          place_id: place.id,
          name: place.displayName?.text || '',
          formatted_address: place.formattedAddress || '',
          geometry: {
            location: {
              lat: place.location?.latitude || 0,
              lng: place.location?.longitude || 0,
            },
          },
          rating: place.rating || 0,
          user_ratings_total: place.userRatingCount || 0,
          price_level: place.priceLevel || undefined,
          photos: place.photos?.map((photo: any) => ({
            getUrl: (options: any) => photo.getURI?.(options) || '',
          })) || [],
          reviews: place.reviews?.map((review: any) => ({
            author_name: review.authorAttribution?.displayName || '',
            rating: review.rating || 0,
            text: review.text?.text || '',
            time: review.publishTime?.seconds || Date.now() / 1000,
          })) || [],
          opening_hours: place.openingHours ? {
            weekday_text: place.openingHours.weekdayDescriptions || [],
            open_now: place.openingHours.openNow || false,
          } : undefined,
          website: place.websiteURI || undefined,
          formatted_phone_number: place.nationalPhoneNumber || undefined,
        };
      } catch (newAPIError) {
        console.warn('New Place.fetchFields API failed, falling back to old API:', newAPIError);
        // Fallback to old API
        return await getPlaceDetailsOldAPI(google, placeId);
      }
    } else {
      // OLD API: PlacesService.getDetails()
      return await getPlaceDetailsOldAPI(google, placeId);
    }
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
}

/**
 * Get place details using OLD Google Places API (PlacesService.getDetails)
 */
async function getPlaceDetailsOldAPI(google: any, placeId: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      const serviceDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(serviceDiv);

      const request = {
        placeId: placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'user_ratings_total',
          'price_level',
          'photos',
          'reviews',
          'opening_hours',
          'website',
          'formatted_phone_number',
        ],
      };

      service.getDetails(request, (place: any, status: any) => {
        try {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            reject(new Error('Place not found'));
          } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
            reject(new Error('Request denied - check API key permissions'));
          } else {
            reject(new Error(`Places API error: ${status}`));
          }
        } catch (callbackError) {
          reject(callbackError);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Search for POIs (Points of Interest) by type
 * Uses searchPlacesByCategory internally
 */
export async function searchPOI(
  location: { lat: number; lng: number },
  type: 'tourist_attraction' | 'restaurant' | 'museum' | 'park' | 'shopping_mall',
  radius: number = 5000
): Promise<POI[]> {
  try {
    const places = await searchPlacesByCategory(location, type, undefined, radius, 20);
    
    return places.map(place => ({
      id: place.place_id,
      name: place.name,
      type: place.type,
      rating: place.rating,
      priceLevel: place.priceLevel,
      address: place.address,
      location: place.location,
      photos: place.photos,
      website: undefined, // Will be fetched if needed via getPlaceDetails
      phoneNumber: undefined, // Will be fetched if needed via getPlaceDetails
      openingHours: place.opening_hours?.weekday_text,
    }));
  } catch (error) {
    console.error('Error searching POI:', error);
    return [];
  }
}

/**
 * Search for hotels near location
 * Uses searchPlacesByCategory with 'lodging' type
 */
export async function searchHotels(
  location: { lat: number; lng: number },
  radius: number = 10000
): Promise<Hotel[]> {
  try {
    await loadGoogleMaps();
    
    const google = (window as any).google;
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const useNewAPI = google.maps.places?.Place?.searchNearby !== undefined;

    if (useNewAPI) {
      // NEW API: Place.searchNearby()
      try {
        const request = {
          locationRestriction: {
            circle: {
              center: { lat: location.lat, lng: location.lng },
              radius: radius,
            },
          },
          includedTypes: ['lodging'],
          maxResultCount: 20,
          languageCode: 'en',
        };

        const { Place } = google.maps.places;
        const response = await Place.searchNearby(request);

        if (response && response.places && response.places.length > 0) {
          return response.places
            .filter((place: any) => place.rating && place.rating >= 3.0)
            .map((place: any) => ({
              id: place.id || place.placeId || '',
              name: place.displayName?.text || place.name || '',
              rating: place.rating || 0,
              priceLevel: place.priceLevel || undefined,
              address: place.formattedAddress || place.address || '',
              location: {
                lat: place.location?.latitude || 0,
                lng: place.location?.longitude || 0,
              },
              photos: place.photos?.slice(0, 3).map((photo: any) => 
                photo.getURI?.({ maxWidth: 400, maxHeight: 300 }) || ''
              ) || [],
              website: place.websiteURI || undefined,
              phoneNumber: place.nationalPhoneNumber || undefined,
              price: undefined, // Not available in basic search
            }));
        }
        return [];
      } catch (newAPIError) {
        console.warn('New API failed for hotels, falling back to old API:', newAPIError);
        return await searchHotelsOldAPI(google, location, radius);
      }
    } else {
      // OLD API: PlacesService.nearbySearch()
      return await searchHotelsOldAPI(google, location, radius);
    }
  } catch (error) {
    console.error('Error searching hotels:', error);
    return [];
  }
}

/**
 * Search hotels using OLD Google Places API
 */
async function searchHotelsOldAPI(
  google: any,
  location: { lat: number; lng: number },
  radius: number
): Promise<Hotel[]> {
  return new Promise((resolve) => {
    try {
      const serviceDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(serviceDiv);

      const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: radius,
        type: ['lodging'],
        language: 'en',
      };

      const timeoutId = setTimeout(() => {
        console.warn('Timeout searching hotels');
        resolve([]);
      }, 15000);

      service.nearbySearch(request, (results: any[], status: any) => {
        clearTimeout(timeoutId);
        
        try {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const hotels: Hotel[] = results
              .filter((place: any) => place.rating && place.rating >= 3.0)
              .map((place: any) => ({
                id: place.place_id,
                name: place.name,
                rating: place.rating || 0,
                priceLevel: place.price_level,
                address: place.vicinity || place.formatted_address || '',
                location: {
                  lat: typeof place.geometry.location.lat === 'function' 
                    ? place.geometry.location.lat() 
                    : place.geometry.location.lat,
                  lng: typeof place.geometry.location.lng === 'function'
                    ? place.geometry.location.lng()
                    : place.geometry.location.lng,
                },
                photos: place.photos?.slice(0, 3).map((photo: any) => 
                  photo.getUrl?.({ maxWidth: 400, maxHeight: 300 }) || ''
                ) || [],
                website: place.website,
                phoneNumber: place.formatted_phone_number,
                price: undefined, // Not available in basic search
              }));
            resolve(hotels);
          } else {
            resolve([]);
          }
        } catch (error) {
          console.error('Error processing hotel results:', error);
          resolve([]);
        }
      });
    } catch (error) {
      console.error('Error setting up hotel search:', error);
      resolve([]);
    }
  });
}
