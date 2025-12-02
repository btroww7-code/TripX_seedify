/**
 * Mapbox Service
 * Integration with Mapbox APIs for route optimization and geocoding
 */

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export interface Waypoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface OptimizedRoute {
  waypoints: Waypoint[];
  distance: number; // in meters
  duration: number; // in seconds
  geometry: any; // GeoJSON LineString
}

export interface GeocodedPlace {
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  placeType: string;
  country?: string;
  city?: string;
}

/**
 * Get optimized route for multiple waypoints
 * Uses Mapbox Directions API with optimization
 * @param waypoints Array of waypoints to optimize
 * @returns Optimized route with waypoints in best order
 */
export async function getOptimizedRoute(waypoints: Waypoint[]): Promise<OptimizedRoute> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token not configured');
  }

  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  if (waypoints.length > 12) {
    // Mapbox Optimization API supports max 12 waypoints
    throw new Error('Maximum 12 waypoints supported');
  }

  try {
    // Format coordinates for Mapbox API: lng,lat;lng,lat;...
    const coordinates = waypoints.map(wp => `${wp.lng},${wp.lat}`).join(';');

    // Use Optimization API for best route order
    const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinates}?` +
      `access_token=${MAPBOX_ACCESS_TOKEN}&` +
      `geometries=geojson&` +
      `overview=full&` +
      `steps=false`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error(`Mapbox API error: ${data.code} - ${data.message || 'Unknown error'}`);
    }

    const trip = data.trips[0];

    // Reorder waypoints according to optimized order
    const optimizedWaypoints = trip.waypoints.map((wp: any) => {
      const originalIndex = wp.waypoint_index;
      return waypoints[originalIndex];
    });

    return {
      waypoints: optimizedWaypoints,
      distance: trip.distance,
      duration: trip.duration,
      geometry: trip.geometry,
    };
  } catch (error: any) {
    console.error('Mapbox getOptimizedRoute error:', error);
    throw new Error(`Failed to get optimized route: ${error.message}`);
  }
}

/**
 * Geocode a place name to coordinates
 * Uses Mapbox Geocoding API
 * @param placeName Name or address of the place
 * @returns Geocoded place with coordinates and metadata
 */
export async function geocodePlace(placeName: string): Promise<GeocodedPlace> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token not configured');
  }

  if (!placeName || placeName.trim().length === 0) {
    throw new Error('Place name is required');
  }

  try {
    const encodedPlace = encodeURIComponent(placeName);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedPlace}.json?` +
      `access_token=${MAPBOX_ACCESS_TOKEN}&` +
      `limit=1`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error(`No results found for: ${placeName}`);
    }

    const feature = data.features[0];
    const [lng, lat] = feature.center;

    // Extract place information
    const context = feature.context || [];
    const city = context.find((c: any) => c.id.startsWith('place'))?.text;
    const country = context.find((c: any) => c.id.startsWith('country'))?.text;

    return {
      name: feature.text || placeName,
      address: feature.place_name || placeName,
      coordinates: { lat, lng },
      placeType: feature.place_type[0] || 'place',
      city: city,
      country: country,
    };
  } catch (error: any) {
    console.error('Mapbox geocodePlace error:', error);
    throw new Error(`Failed to geocode place: ${error.message}`);
  }
}

/**
 * Get distance and duration between two points
 * Uses Mapbox Directions API
 * @param origin Starting point
 * @param destination End point
 * @returns Distance in meters and duration in seconds
 */
export async function getDistanceAndDuration(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distance: number; duration: number }> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('Mapbox access token not configured');
  }

  try {
    const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?` +
      `access_token=${MAPBOX_ACCESS_TOKEN}&` +
      `geometries=geojson&` +
      `overview=simplified`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = data.routes[0];

    return {
      distance: route.distance, // meters
      duration: route.duration, // seconds
    };
  } catch (error: any) {
    console.error('Mapbox getDistanceAndDuration error:', error);
    
    // Fallback: Calculate straight-line distance using Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = (origin.lat * Math.PI) / 180;
    const φ2 = (destination.lat * Math.PI) / 180;
    const Δφ = ((destination.lat - origin.lat) * Math.PI) / 180;
    const Δλ = ((destination.lng - origin.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    const duration = distance / (50 * 1000 / 3600); // Assume 50 km/h average speed

    return {
      distance: Math.round(distance),
      duration: Math.round(duration),
    };
  }
}

/**
 * Batch geocode multiple places
 * @param placeNames Array of place names to geocode
 * @returns Array of geocoded places
 */
export async function batchGeocodePlace(placeNames: string[]): Promise<GeocodedPlace[]> {
  const results = await Promise.all(
    placeNames.map(async (placeName) => {
      try {
        return await geocodePlace(placeName);
      } catch (error) {
        console.error(`Failed to geocode ${placeName}:`, error);
        return null;
      }
    })
  );

  return results.filter((r): r is GeocodedPlace => r !== null);
}

/**
 * Calculate optimal order of places to visit
 * Groups nearby places and minimizes total travel distance
 * @param places Array of places with coordinates
 * @returns Array of places in optimal order
 */
export function calculateOptimalOrder<T extends { lat: number; lng: number }>(
  places: T[]
): T[] {
  if (places.length <= 2) {
    return places;
  }

  // Simple greedy algorithm: always go to nearest unvisited place
  const visited = new Set<number>();
  const ordered: T[] = [];

  // Start with the first place
  let currentIndex = 0;
  visited.add(0);
  ordered.push(places[0]);

  while (visited.size < places.length) {
    let nearestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < places.length; i++) {
      if (visited.has(i)) continue;

      const distance = getHaversineDistance(
        places[currentIndex].lat,
        places[currentIndex].lng,
        places[i].lat,
        places[i].lng
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = i;
      }
    }

    if (nearestIndex !== -1) {
      visited.add(nearestIndex);
      ordered.push(places[nearestIndex]);
      currentIndex = nearestIndex;
    } else {
      break;
    }
  }

  return ordered;
}

/**
 * Calculate Haversine distance between two points
 * @returns Distance in meters
 */
function getHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

