const BACKEND_URL = 'http://localhost:3002';

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
}

export interface JourneyLeg {
  type: 'transit' | 'transfer' | 'walk';
  from: {
    stop_id: string;
    stop_name: string;
    lat: number;
    lon: number;
    departure_time?: string;
    arrival_time?: string;
  };
  to: {
    stop_id: string;
    stop_name: string;
    lat: number;
    lon: number;
    arrival_time?: string;
    departure_time?: string;
  };
  route?: {
    id: string;
    name: string;
    long_name?: string;
    type: number;
    color?: string;
    headsign?: string;
  };
  duration_minutes: number;
}

export interface Journey {
  type: 'direct' | 'transfer';
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  transfers: number;
  legs: JourneyLeg[];
}

export interface JourneyPlanResponse {
  from: Stop;
  to: Stop;
  departure_time: string;
  journeys: Journey[];
  total_found: number;
}

// Search stops by name
export async function searchStops(query: string): Promise<Stop[]> {
  try {
    console.log('🔍 Searching stops:', query);
    
    const response = await fetch(`${BACKEND_URL}/api/stops/search?query=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to search stops: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Found stops:', data.stops.length);
    
    return data.stops;
  } catch (error) {
    console.error('❌ Error searching stops:', error);
    throw error;
  }
}

// Get stop details
export async function getStop(stopId: string): Promise<Stop> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/stops/${stopId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stop: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching stop:', error);
    throw error;
  }
}

// Get departures from stop
export async function getDepartures(stopId: string, time?: string) {
  try {
    const timeParam = time ? `?time=${time}` : '';
    const response = await fetch(`${BACKEND_URL}/api/stops/${stopId}/departures${timeParam}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch departures: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching departures:', error);
    throw error;
  }
}

// Plan journey
export async function planJourney(
  from: { stop_id?: string; name?: string; lat?: number; lon?: number },
  to: { stop_id?: string; name?: string; lat?: number; lon?: number },
  time?: string,
  date?: string
): Promise<JourneyPlanResponse> {
  try {
    console.log('🗺️ Planning journey:', { from, to, time, date });
    
    const response = await fetch(`${BACKEND_URL}/api/journey/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        time: time || new Date().toTimeString().slice(0, 8),
        date: date || new Date().toISOString().slice(0, 10),
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to plan journey: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Found journeys:', data.journeys.length);
    console.log('📦 First journey:', data.journeys[0]);
    
    // Backend już zwraca poprawny format - NIE KONWERTUJ!
    return data;
  } catch (error) {
    console.error('❌ Error planning journey:', error);
    throw error;
  }
}

// Get route type name
export function getRouteTypeName(type: number): string {
  const types: Record<number, string> = {
    0: 'Tramwaj',
    1: 'Metro',
    2: 'Kolej',
    3: 'Autobus',
    4: 'Prom',
    5: 'Kolejka linowa',
    6: 'Gondola',
    7: 'Funicular',
  };
  return types[type] || 'Transport';
}

// Convert GTFS route type to TransportMode
function routeTypeToTransportMode(routeType: number): string {
  const mapping: Record<number, string> = {
    0: 'Tram',
    1: 'Subway',
    2: 'Train',
    3: 'Bus',
    4: 'Ferry',
    5: 'Train',
    6: 'Train',
    7: 'Train',
  };
  return mapping[routeType] || 'Bus';
}

// Convert backend journey format to frontend Journey type
export function convertBackendToJourney(backendJourney: any, from: Stop, to: Stop): any {
  const legs: any[] = [];
  let allStops: any[] = [];
  
  for (const leg of backendJourney.legs) {
    if (leg.type === 'transit') {
      const stops = [
        {
          id: leg.from.stop_id,
          name: leg.from.stop_name,
          lat: leg.from.lat,
          lng: leg.from.lon,
          time: leg.from.departure_time,
          stopType: leg.route.type === 1 ? 'metro_station' : 
                    leg.route.type === 2 ? 'train_station' :
                    leg.route.type === 0 ? 'tram_stop' : 'bus_stop',
        },
        {
          id: leg.to.stop_id,
          name: leg.to.stop_name,
          lat: leg.to.lat,
          lng: leg.to.lon,
          time: leg.to.arrival_time,
          stopType: leg.route.type === 1 ? 'metro_station' :
                    leg.route.type === 2 ? 'train_station' :
                    leg.route.type === 0 ? 'tram_stop' : 'bus_stop',
        },
      ];
      
      allStops.push(...stops);
      
      legs.push({
        mode: routeTypeToTransportMode(leg.route.type),
        details: `${leg.route.name} → ${leg.route.headsign || leg.to.stop_name}`,
        from: leg.from.stop_name,
        to: leg.to.stop_name,
        departureTime: leg.from.departure_time,
        arrivalTime: leg.to.arrival_time,
        duration: `${leg.duration_minutes} min`,
        operator: leg.route.long_name || `Linia ${leg.route.name}`,
        operatorId: leg.route.id,
        lineNumber: leg.route.name,
        vehicleType: getRouteTypeName(leg.route.type),
        stops: stops,
        price: '3.40 PLN', // TODO: Real pricing based on operator
        bookingUrl: getTicketUrl(leg.route.long_name || 'ZTM'),
      });
    } else if (leg.type === 'transfer') {
      legs.push({
        mode: 'Walk',
        details: 'Przesiadka',
        from: leg.from.stop_name,
        to: leg.to.stop_name,
        departureTime: leg.from.arrival_time,
        arrivalTime: leg.to.departure_time,
        duration: `${leg.duration_minutes} min`,
        operator: 'Przesiadka',
        distance: '50 m', // TODO: Calculate real distance
      });
    }
  }
  
  return {
    summary: `${from.stop_name} → ${to.stop_name}`,
    totalDuration: `${backendJourney.duration_minutes} min`,
    totalPrice: calculateTotalPrice(legs),
    legs: legs,
    routePolyline: '', // TODO: Generate polyline from stops
    stops: allStops,
    transferCount: backendJourney.transfers,
    walkingDistance: calculateWalkingDistance(legs),
  };
}

// Helper: Get ticket purchase URL based on operator
function getTicketUrl(operator: string): string {
  const urls: Record<string, string> = {
    'ZTM Warszawa': 'https://www.wtp.waw.pl/',
    'MPK Kraków': 'https://www.mpk.krakow.pl/pl/bilety/',
    'MPK Wrocław': 'https://www.mpk.wroc.pl/bilety',
    'ZTM Poznań': 'https://www.ztm.poznan.pl/pl/bilety/',
    'ZTM Gdańsk': 'https://www.ztm.gda.pl/bilety',
    'PKP Intercity': 'https://koleo.pl/',
  };
  
  for (const [key, url] of Object.entries(urls)) {
    if (operator.includes(key)) return url;
  }
  
  return 'https://mobilet.pl/'; // Default
}

// Helper: Calculate total price
function calculateTotalPrice(legs: any[]): string {
  // Simplified pricing - in reality this should be based on zones, distance, etc.
  const transitLegs = legs.filter(leg => leg.mode !== 'Walk').length;
  const price = transitLegs * 3.40; // Average ticket price
  return `${price.toFixed(2)} PLN`;
}

// Helper: Calculate walking distance
function calculateWalkingDistance(legs: any[]): string {
  const walkingLegs = legs.filter(leg => leg.mode === 'Walk');
  const totalMeters = walkingLegs.length * 50; // Simplified
  return totalMeters > 1000 ? `${(totalMeters / 1000).toFixed(1)} km` : `${totalMeters} m`;
}

// Plan journey - Enhanced mode with AI
export async function planJourneyEnhanced(
  from: string,
  to: string,
  time?: string,
  preferences?: any,
  query?: string
): Promise<any> {
  try {
    console.log('🤖 Planning ENHANCED journey:', { from, to, time, preferences, query });
    
    const response = await fetch(`${BACKEND_URL}/api/journey/plan-enhanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        time: time || 'now',
        preferences: preferences || {},
        query: query || null,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to plan enhanced journey: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Enhanced search complete:', data.variants?.length, 'variants');
    
    return data;
  } catch (error) {
    console.error('❌ Error planning enhanced journey:', error);
    throw error;
  }
}

// Plan journey - Quick mode
export async function planJourneyQuick(
  from: string,
  to: string,
  time?: string
): Promise<any> {
  try {
    console.log('⚡ Planning QUICK journey:', { from, to, time });
    
    const response = await fetch(`${BACKEND_URL}/api/journey/plan-quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        time: time || 'now',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to plan quick journey: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Quick search complete:', data.variants?.length, 'variants');
    
    return data;
  } catch (error) {
    console.error('❌ Error planning quick journey:', error);
    throw error;
  }
}
