/**
 * Google Places Autocomplete Service - Using NEW Google Places API (2025)
 * Migrated from deprecated AutocompleteService to new AutocompleteSuggestionService
 */

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY;

console.log('🔑 Google Maps API Key:', GOOGLE_MAPS_API_KEY ? 'ZAŁADOWANY ✅' : '❌ BRAK!');

// Use central Google Maps loader
import { loadGoogleMaps } from '../lib/googleMapsLoader';

// Cache dla wyników
const cache = new Map<string, { results: string[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut

/**
 * Pobiera sugestie miejsc używając NOWEGO Google Places Autocomplete API
 * Falls back to old API if new API is not available
 */
export async function getPlacesSuggestionsSimple(
    query: string,
    userLocation?: { lat: number; lng: number }
): Promise<string[]> {
    console.log('🔍 getPlacesSuggestionsSimple - query:', query);
    
    // Minimalna długość zapytania
    if (!query || query.length < 2) {
        console.log('⚠️ Query za krótkie (<2 znaki)');
        return [];
    }

    // Sprawdź cache
    const cacheKey = `${query}_${userLocation?.lat}_${userLocation?.lng}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('✅ Zwracam z cache:', cached.results);
        return cached.results;
    }

    try {
        // Załaduj Google Maps API
        console.log('📡 Ładuję Google Maps API...');
        await loadGoogleMaps();
        console.log('✅ Google Maps API załadowane!');
        
        // Użyj globalnego google.maps
        const google = (window as any).google;
        if (!google || !google.maps || !google.maps.places) {
            throw new Error('Google Maps API nie załadowane poprawnie');
        }
        
        // Always try NEW API first, fallback to OLD if unavailable
        let predictions: any[] = [];

        try {
            console.log('🔎 Trying NEW Autocomplete API...');
            predictions = await getSuggestionsWithNewAPI(google, query, userLocation);
        } catch (newAPIError) {
            console.warn('⚠️ New API not available, using old API:', newAPIError);
            predictions = await getSuggestionsWithOldAPI(google, query, userLocation);
        }
        
        // Konwertuj wyniki
        const suggestions = predictions.map((p: any) => p.description || p.text || p);
        console.log('✅ Google Places zwróciło:', suggestions.length, 'sugestii');
        
        // Cache wyniki
        cache.set(cacheKey, { results: suggestions, timestamp: Date.now() });
        
        return suggestions;
        
    } catch (error) {
        console.error('❌ Google Places API error:', error);
        // Return empty - frontend will use backend GTFS stops
        return [];
    }
}

/**
 * Get suggestions using NEW Google Places API (AutocompleteSuggestionService)
 */
async function getSuggestionsWithNewAPI(
    google: any,
    query: string,
    userLocation?: { lat: number; lng: number }
): Promise<any[]> {
    return new Promise((resolve, reject) => {
        try {
            const service = new google.maps.places.AutocompleteSuggestionService();
            
            const request: any = {
                input: query,
                languageCode: 'pl',
                regionCode: 'pl',
            };

            // Add location bias if user location is available
            if (userLocation) {
                request.locationBias = {
                    circle: {
                        center: { lat: userLocation.lat, lng: userLocation.lng },
                        radius: 50000, // 50km
                    },
                };
                console.log('📍 Używam lokalizacji użytkownika:', userLocation);
            }

            console.log('📤 Wysyłam request do Google Places API (NEW API)...');
            
            service.getSuggestions(request, (results: any, status: any) => {
                console.log('📥 Google Places API Status (NEW):', status, '| Wyniki:', results?.length || 0);
                
                if (status === 'OK' && results) {
                    resolve(results);
                } else if (status === 'ZERO_RESULTS') {
                    console.log('⚠️ Google zwróciło 0 wyników (NEW API)');
                    resolve([]);
                } else {
                    reject(new Error(`Google Places API error (NEW): ${status}`));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get suggestions using OLD Google Places API (AutocompleteService)
 * This is deprecated but still works for existing customers
 */
async function getSuggestionsWithOldAPI(
    google: any,
    query: string,
    userLocation?: { lat: number; lng: number }
): Promise<any[]> {
    return new Promise((resolve, reject) => {
        try {
            const service = new google.maps.places.AutocompleteService();
            
            // Przygotuj request - SIMPLIFIED to avoid ZERO_RESULTS
            const request: any = {
                input: query,
                // Don't restrict by country - it can cause ZERO_RESULTS
                // componentRestrictions: { country: 'pl' },
                language: 'pl',
            };

            // Use locationBias instead of deprecated location/radius
            if (userLocation) {
                request.locationBias = {
                    center: { lat: userLocation.lat, lng: userLocation.lng },
                    radius: 50000, // 50km
                };
                console.log('📍 Używam lokalizacji użytkownika:', userLocation);
            }

            console.log('📤 Wysyłam request do Google Places API (OLD API)...');
            
            // Wywołaj API
            service.getPlacePredictions(request, (results: any, status: any) => {
                console.log('📥 Google Places API Status (OLD):', status, '| Wyniki:', results?.length || 0);
                
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    resolve(results);
                } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    console.log('⚠️ Google zwróciło 0 wyników (OLD API)');
                    resolve([]);
                } else {
                    reject(new Error(`Google Places API error (OLD): ${status}`));
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}
