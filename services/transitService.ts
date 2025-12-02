const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY;

export interface TransitRoute {
  summary: string;
  totalDuration: string;
  totalDistance: string;
  departureTime: string;
  arrivalTime: string;
  legs: TransitLeg[];
  warnings: string[];
  polyline?: string;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface TransitLeg {
  mode: 'WALKING' | 'TRANSIT' | 'DRIVING';
  transitDetails?: {
    line: {
      name: string;
      shortName: string;
      vehicle: {
        type: string;
        icon: string;
      };
      color: string;
      agencies: Array<{ name: string }>;
    };
    departureStop: {
      name: string;
      location: { lat: number; lng: number };
    };
    arrivalStop: {
      name: string;
      location: { lat: number; lng: number };
    };
    departureTime: string;
    arrivalTime: string;
    numStops: number;
    headsign: string;
  };
  distance: string;
  duration: string;
  instructions: string;
  startAddress: string;
  endAddress: string;
  steps: TransitStep[];
  polyline?: string;
  startLocation?: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
}

export interface TransitStep {
  instruction: string;
  distance: string;
  duration: string;
  travelMode: string;
  transitDetails?: any;
}

// Use central Google Maps loader
import { loadGoogleMaps } from '../lib/googleMapsLoader';

// Warsaw bounds (approximate)
const WARSAW_BOUNDS = {
  north: 52.35,
  south: 52.10,
  east: 21.25,
  west: 20.80,
};

/**
 * Check if coordinates are within Warsaw bounds
 */
function isInWarsaw(lat: number, lng: number): boolean {
  return (
    lat >= WARSAW_BOUNDS.south &&
    lat <= WARSAW_BOUNDS.north &&
    lng >= WARSAW_BOUNDS.west &&
    lng <= WARSAW_BOUNDS.east
  );
}

/**
 * Check if address string contains Warsaw-related keywords
 */
function isWarsawAddress(address: string): boolean {
  const warsawKeywords = ['warszawa', 'warsaw', 'waw', 'ztm'];
  const lowerAddress = address.toLowerCase();
  return warsawKeywords.some(keyword => lowerAddress.includes(keyword));
}

/**
 * Geocode address to coordinates
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    await loadGoogleMaps();
    const google = (window as any).google;
    if (!google || !google.maps) {
      return null;
    }

    const geocoder = new google.maps.Geocoder();
    return new Promise((resolve) => {
      geocoder.geocode({ address, region: 'pl' }, (results: any, status: any) => {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Search ZTM Warszawa API for routes
 * Note: ZTM API requires backend proxy due to CORS
 */
async function searchZTMAPI(
  origin: string,
  destination: string,
  departureTime?: Date
): Promise<TransitRoute[]> {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';
    const response = await fetch(`${API_BASE_URL}/api/transit/ztm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        origin,
        destination,
        departureTime: departureTime?.toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn('ZTM API not available, falling back to Google Maps');
      return [];
    }

    const data = await response.json();
    if (data.success && data.routes) {
      return data.routes;
    }
    return [];
  } catch (error) {
    console.warn('ZTM API error, falling back to Google Maps:', error);
    return [];
  }
}

export async function searchTransitRoutes(
  origin: string,
  destination: string,
  departureTime?: Date
): Promise<TransitRoute[]> {
  try {
    // Check if both locations are in Warsaw
    const originCoords = await geocodeAddress(origin);
    const destCoords = await geocodeAddress(destination);
    
    const isOriginWarsaw = originCoords 
      ? isInWarsaw(originCoords.lat, originCoords.lng) 
      : isWarsawAddress(origin);
    const isDestWarsaw = destCoords 
      ? isInWarsaw(destCoords.lat, destCoords.lng) 
      : isWarsawAddress(destination);

    // If both are in Warsaw, try ZTM API first
    if (isOriginWarsaw && isDestWarsaw) {
      console.log('📍 Both locations in Warsaw, trying ZTM API...');
      const ztmRoutes = await searchZTMAPI(origin, destination, departureTime);
      if (ztmRoutes.length > 0) {
        console.log(`✅ Found ${ztmRoutes.length} routes from ZTM API`);
        return ztmRoutes;
      }
      console.log('⚠️ ZTM API returned no routes, falling back to Google Maps');
    }

    // Load Google Maps API
    await loadGoogleMaps();
    
    const google = (window as any).google;
    if (!google || !google.maps) {
      throw new Error('Google Maps API not loaded');
    }

    const directionsService = new google.maps.DirectionsService();
    const depTime = departureTime || new Date();
    
    const request: any = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.TRANSIT,
      provideRouteAlternatives: true,
      region: 'PL',
      language: 'pl',
      transitOptions: {
        modes: [
          google.maps.TransitMode.BUS,
          google.maps.TransitMode.SUBWAY,
          google.maps.TransitMode.TRAIN,
          google.maps.TransitMode.TRAM,
          google.maps.TransitMode.RAIL
        ],
        routingPreference: google.maps.TransitRoutePreference.FEWER_TRANSFERS
      }
    };

    // Add departure time
    if (departureTime) {
      request.transitOptions.departureTime = depTime;
    }

    // Use Directions Service (works in browser, no CORS issues)
    return new Promise((resolve, reject) => {
      directionsService.route(request, (result: any, status: any) => {
        console.log('🔍 Transit search status:', status);
        console.log('🔍 Transit search result:', result);
        
        if (status === google.maps.DirectionsStatus.OK && result) {
          const routes: TransitRoute[] = result.routes.map((route: any) => {
            const leg = route.legs[0];
            
            // Parse all steps in the route - JavaScript SDK używa step.transit, nie step.transit_details
            const parsedLegs: TransitLeg[] = leg.steps.map((step: any) => {
              // Sprawdź różne możliwe formaty
              const travelMode = step.travel_mode || step.travelMode;
              const isTransit = travelMode === 'TRANSIT' || 
                              travelMode === google.maps?.TravelMode?.TRANSIT ||
                              travelMode === 3; // TRANSIT enum value
              const transit = step.transit || step.transit_details; // Fallback dla różnych formatów
              
              const baseLeg: TransitLeg = {
                mode: isTransit ? 'TRANSIT' : 
                      (travelMode === 'DRIVING' || travelMode === google.maps?.TravelMode?.DRIVING || travelMode === 0) ? 'DRIVING' : 'WALKING',
                distance: step.distance?.text || '0 m',
                duration: step.duration?.text || '0 min',
                instructions: step.html_instructions?.replace(/<[^>]*>/g, '') || step.instructions?.replace(/<[^>]*>/g, '') || step.distance?.text || '',
                startAddress: step.start_location ? '' : (leg.start_address || ''),
                endAddress: step.end_location ? '' : (leg.end_address || ''),
                steps: [],
              };

              // If it's a transit step, add details - JavaScript SDK format
              if (isTransit && transit) {
                const line = transit.line || {};
                const vehicle = line.vehicle || {};
                const departureStop = transit.departure_stop || {};
                const arrivalStop = transit.arrival_stop || {};
                const departureTime = transit.departure_time || {};
                const arrivalTime = transit.arrival_time || {};

                // Get location coordinates (may be LatLng object or plain object)
                const getLocationCoords = (location: any) => {
                  if (!location) return { lat: 0, lng: 0 };
                  if (location.lat && typeof location.lat === 'function') {
                    return { lat: location.lat(), lng: location.lng() };
                  }
                  return { lat: location.lat || 0, lng: location.lng || 0 };
                };

                // Get time text (may be Date object or plain object)
                const getTimeText = (timeObj: any) => {
                  if (!timeObj) return 'Unknown';
                  if (timeObj.text) return timeObj.text;
                  if (timeObj instanceof Date) {
                    return timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  if (timeObj.value) {
                    const date = new Date(timeObj.value);
                    if (typeof timeObj.value === 'number') {
                      // Unix timestamp
                      return new Date(timeObj.value * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    }
                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  }
                  return 'Unknown';
                };

                // Format stop names with type information
                const formatStopName = (stopName: string, vehicleType: string) => {
                  if (!stopName) return 'Stop';

                  // Check if name already contains type info
                  const lowerName = stopName.toLowerCase();
                  if (lowerName.includes('metro') || lowerName.includes('subway') ||
                      lowerName.includes('station') || lowerName.includes('przystanek') ||
                      lowerName.includes('dworzec') || lowerName.includes('terminal')) {
                    return stopName;
                  }

                  // Add type based on vehicle
                  const vType = vehicleType.toUpperCase();
                  if (vType === 'SUBWAY' || vType === 'METRO_RAIL') {
                    return `Metro ${stopName}`;
                  } else if (vType === 'TRAIN' || vType === 'RAIL' || vType === 'HEAVY_RAIL') {
                    return `${stopName} Station`;
                  } else if (vType === 'BUS') {
                    return `${stopName} (Bus Stop)`;
                  } else if (vType === 'TRAM') {
                    return `${stopName} (Tram Stop)`;
                  }

                  return stopName;
                };

                const vehicleType = vehicle.type || 'BUS';

                baseLeg.transitDetails = {
                  line: {
                    name: line.name || 'Line',
                    shortName: line.short_name || '',
                    vehicle: {
                      type: vehicleType,
                      icon: vehicle.icon || '',
                    },
                    color: line.color || '#000000',
                    agencies: line.agencies || [],
                  },
                  departureStop: {
                    name: formatStopName(departureStop.name || 'Stop', vehicleType),
                    location: getLocationCoords(departureStop.location || departureStop),
                  },
                  arrivalStop: {
                    name: formatStopName(arrivalStop.name || 'Stop', vehicleType),
                    location: getLocationCoords(arrivalStop.location || arrivalStop),
                  },
                  departureTime: getTimeText(departureTime),
                  arrivalTime: getTimeText(arrivalTime),
                  numStops: transit.num_stops || 0,
                  headsign: transit.headsign || '',
                };
              }

              // Add polyline and location data
              if (step.polyline) {
                baseLeg.polyline = step.polyline.points || step.polyline;
              }

              const getStepLocation = (loc: any) => {
                if (!loc) return undefined;
                if (loc.lat && typeof loc.lat === 'function') {
                  return { lat: loc.lat(), lng: loc.lng() };
                }
                return { lat: loc.lat || 0, lng: loc.lng || 0 };
              };

              baseLeg.startLocation = getStepLocation(step.start_location);
              baseLeg.endLocation = getStepLocation(step.end_location);

              return baseLeg;
            });

            // Extract polyline for entire route
            const routePolyline = route.overview_polyline?.points || route.overview_polyline || '';

            // Extract bounds
            const bounds = route.bounds ? {
              northeast: {
                lat: typeof route.bounds.getNorthEast === 'function'
                  ? route.bounds.getNorthEast().lat()
                  : route.bounds.northeast?.lat || route.bounds.northeast?.lat() || 0,
                lng: typeof route.bounds.getNorthEast === 'function'
                  ? route.bounds.getNorthEast().lng()
                  : route.bounds.northeast?.lng || route.bounds.northeast?.lng() || 0,
              },
              southwest: {
                lat: typeof route.bounds.getSouthWest === 'function'
                  ? route.bounds.getSouthWest().lat()
                  : route.bounds.southwest?.lat || route.bounds.southwest?.lat() || 0,
                lng: typeof route.bounds.getSouthWest === 'function'
                  ? route.bounds.getSouthWest().lng()
                  : route.bounds.southwest?.lng || route.bounds.southwest?.lng() || 0,
              },
            } : undefined;

            return {
              summary: route.summary || 'Public transit route',
              totalDuration: leg.duration?.text || 'Unknown',
              totalDistance: leg.distance?.text || '0 km',
              departureTime: leg.departure_time?.text ||
                           (leg.departure_time?.value ?
                            new Date(leg.departure_time.value * 1000).toLocaleTimeString('en-US') :
                            'Now'),
              arrivalTime: leg.arrival_time?.text ||
                          (leg.arrival_time?.value ?
                           new Date(leg.arrival_time.value * 1000).toLocaleTimeString('en-US') :
                           'Unknown'),
              warnings: route.warnings || [],
              legs: parsedLegs,
              polyline: routePolyline,
              bounds,
            };
          });
          
          resolve(routes);
        } else if (status === google.maps.DirectionsStatus.ZERO_RESULTS) {
          console.log('⚠️ No routes found (ZERO_RESULTS)');
          resolve([]);
        } else {
          const errorMessages: Record<string, string> = {
            [google.maps.DirectionsStatus.NOT_FOUND]: 'One of the locations was not found. Please check the addresses.',
            [google.maps.DirectionsStatus.REQUEST_DENIED]: 'No permission to search routes. Please check API key.',
            [google.maps.DirectionsStatus.OVER_QUERY_LIMIT]: 'Query limit exceeded. Please try again later.',
            [google.maps.DirectionsStatus.INVALID_REQUEST]: 'Invalid request. Please check search parameters.',
          };
          const errorMsg = errorMessages[status] || `Search error: ${status}`;
          console.error('❌ Transit search error:', status, errorMsg);
          reject(new Error(errorMsg));
        }
      });
    });
  } catch (error: any) {
    console.error('Transit search error:', error);
    throw new Error(error.message || 'Failed to search transit routes');
  }
}

export function getTransitIcon(type: string): string {
  const icons: Record<string, string> = {
    BUS: '🚌',
    SUBWAY: '🚇',
    TRAIN: '🚆',
    TRAM: '🚊',
    RAIL: '🚄',
    HEAVY_RAIL: '🚅',
    COMMUTER_TRAIN: '🚆',
    HIGH_SPEED_TRAIN: '🚄',
    LONG_DISTANCE_TRAIN: '🚂',
    METRO_RAIL: '🚇',
    MONORAIL: '🚝',
    TROLLEYBUS: '🚎',
    FERRY: '⛴️',
    CABLE_CAR: '🚟',
    GONDOLA_LIFT: '🚠',
    FUNICULAR: '🚞',
    WALKING: '🚶',
  };
  return icons[type] || '🚌';
}

export function getVehicleColor(type: string): string {
  const colors: Record<string, string> = {
    BUS: '#10b981',
    SUBWAY: '#3b82f6',
    TRAIN: '#8b5cf6',
    TRAM: '#f59e0b',
    RAIL: '#8b5cf6',
    HEAVY_RAIL: '#6366f1',
    WALKING: '#64748b',
  };
  return colors[type] || '#10b981';
}
