/**
 * Serwis integracji z Google Maps API
 * Wykorzystuje Directions API, Places API i Transit API
 */

import { Journey, Leg, Stop, Geolocation } from '../types/transport';
import { POLISH_TRANSPORT_OPERATORS, getOperatorById } from '../data/operators';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface GoogleDirectionsRequest {
    origin: string;
    destination: string;
    travelMode: 'TRANSIT' | 'DRIVING' | 'WALKING' | 'BICYCLING';
    transitOptions?: {
        departureTime?: Date;
        arrivalTime?: Date;
        modes?: ('BUS' | 'RAIL' | 'SUBWAY' | 'TRAIN' | 'TRAM')[];
        routingPreference?: 'FEWER_TRANSFERS' | 'LESS_WALKING';
    };
    alternatives?: boolean;
    region?: string;
    language?: string;
}

interface GoogleTransitDetails {
    arrival_stop: {
        name: string;
        location: { lat: number; lng: number };
    };
    arrival_time: {
        text: string;
        time_zone: string;
        value: number;
    };
    departure_stop: {
        name: string;
        location: { lat: number; lng: number };
    };
    departure_time: {
        text: string;
        time_zone: string;
        value: number;
    };
    headsign: string;
    line: {
        agencies: Array<{
            name: string;
            url?: string;
        }>;
        name: string;
        short_name?: string;
        vehicle: {
            type: string;
            name: string;
            icon?: string;
        };
    };
    num_stops: number;
}

/**
 * Pobiera trasy z Google Directions API
 */
export const getGoogleDirections = async (
    from: string,
    to: string,
    dateTime: string
): Promise<Journey[]> => {
    try {
        const departureTime = new Date(dateTime);
        const timestamp = Math.floor(departureTime.getTime() / 1000);

        // Budujemy URL do Google Directions API
        const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
        url.searchParams.append('origin', from);
        url.searchParams.append('destination', to);
        url.searchParams.append('mode', 'transit');
        url.searchParams.append('departure_time', timestamp.toString());
        url.searchParams.append('alternatives', 'true');
        url.searchParams.append('region', 'pl');
        url.searchParams.append('language', 'pl');
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY);
        url.searchParams.append('transit_mode', 'bus|rail|subway|train|tram');

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status !== 'OK') {
            console.error('Google Directions API error:', data.status, data.error_message);
            throw new Error(`Błąd Google Maps API: ${data.status}`);
        }

        // Konwertujemy odpowiedź Google na nasze Journey
        const journeys: Journey[] = data.routes.map((route: any, index: number) => {
            return parseGoogleRoute(route, index);
        });

        return journeys;
    } catch (error) {
        console.error('Error fetching Google Directions:', error);
        throw error;
    }
};

/**
 * Parsuje trasę z Google do naszego formatu Journey
 */
function parseGoogleRoute(route: any, routeIndex: number): Journey {
    const leg = route.legs[0]; // Google zwraca jedną "leg" dla całej trasy
    const steps = leg.steps;

    // Ekstraktujemy nasze "legs" z kroków Google
    const ourLegs: Leg[] = steps.map((step: any) => {
        return parseGoogleStep(step);
    });

    // Zbieramy wszystkie przystanki
    const allStops: Stop[] = [];
    ourLegs.forEach(ourLeg => {
        if (ourLeg.stops) {
            allStops.push(...ourLeg.stops);
        }
    });

    // Obliczamy liczbę przesiadek (liczba segmentów tranzytowych - 1)
    const transitLegs = ourLegs.filter(l => l.mode !== 'Walk');
    const transferCount = transitLegs.length > 0 ? transitLegs.length - 1 : 0;

    // Obliczamy całkowity dystans pieszy
    const walkingLegs = ourLegs.filter(l => l.mode === 'Walk');
    const totalWalkingDistance = walkingLegs.reduce((sum, l) => {
        const match = l.distance?.match(/(\d+\.?\d*)/);
        return sum + (match ? parseFloat(match[1]) : 0);
    }, 0);

    // Generujemy podsumowanie
    const summary = routeIndex === 0 
        ? 'Najszybsza trasa' 
        : transferCount === 0
        ? 'Bez przesiadek'
        : transferCount === 1
        ? '1 przesiadka'
        : `${transferCount} przesiadek`;

    return {
        summary,
        totalDuration: leg.duration.text,
        totalPrice: calculateEstimatedPrice(ourLegs),
        legs: ourLegs,
        routePolyline: route.overview_polyline.points,
        stops: allStops,
        transferCount,
        walkingDistance: totalWalkingDistance > 0 ? `${totalWalkingDistance.toFixed(1)} km` : undefined,
        departure_time: leg.departure_time?.text || 'Now',
        arrival_time: leg.arrival_time?.text || 'Unknown',
    };
}

/**
 * Parsuje pojedynczy krok z Google do naszego Leg
 */
function parseGoogleStep(step: any): Leg {
    const isTransit = step.travel_mode === 'TRANSIT';
    
    if (isTransit && step.transit_details) {
        const transit: GoogleTransitDetails = step.transit_details;
        const vehicleType = transit.line.vehicle.type.toLowerCase();
        
        // Mapowanie typów pojazdów Google na nasze TransportMode
        let mode: any = 'Bus';
        if (vehicleType.includes('train') || vehicleType.includes('rail')) {
            mode = 'Train';
        } else if (vehicleType.includes('subway') || vehicleType.includes('metro')) {
            mode = 'Subway';
        } else if (vehicleType.includes('tram')) {
            mode = 'Tram';
        } else if (vehicleType.includes('bus')) {
            mode = 'Bus';
        }

        // Próbujemy zmapować operatora na naszą bazę
        const agencyName = transit.line.agencies[0]?.name || '';
        const operatorId = findOperatorIdByName(agencyName);
        const operator = operatorId ? getOperatorById(operatorId) : null;

        // Budujemy listę wszystkich przystanków (jeśli dostępne)
        const stops: Stop[] = [
            {
                name: transit.departure_stop.name,
                lat: transit.departure_stop.location.lat,
                lng: transit.departure_stop.location.lng,
                time: formatTime(transit.departure_time.value),
                stopType: mode === 'Train' ? 'train_station' : mode === 'Subway' ? 'metro_station' : 
                         mode === 'Tram' ? 'tram_stop' : 'bus_stop',
            },
            {
                name: transit.arrival_stop.name,
                lat: transit.arrival_stop.location.lat,
                lng: transit.arrival_stop.location.lng,
                time: formatTime(transit.arrival_time.value),
                stopType: mode === 'Train' ? 'train_station' : mode === 'Subway' ? 'metro_station' : 
                         mode === 'Tram' ? 'tram_stop' : 'bus_stop',
            },
        ];

        return {
            mode,
            from: transit.departure_stop.name,
            to: transit.arrival_stop.name,
            departureTime: formatTime(transit.departure_time.value),
            arrivalTime: formatTime(transit.arrival_time.value),
            duration: step.duration.text,
            details: `${transit.line.short_name || transit.line.name} → ${transit.headsign}`,
            operator: agencyName,
            operatorId: operatorId,
            lineNumber: transit.line.short_name || transit.line.name,
            vehicleType: transit.line.vehicle.name,
            distance: step.distance.text,
            stops,
            polyline: step.polyline?.points,
            bookingUrl: operator?.ticketingUrl,
        };
    } else {
        // Odcinek pieszy
        return {
            mode: 'Walk',
            from: step.start_location ? getLocationName(step.start_location) : 'Start',
            to: step.end_location ? getLocationName(step.end_location) : 'Koniec',
            departureTime: '',
            arrivalTime: '',
            duration: step.duration.text,
            details: step.html_instructions ? stripHtml(step.html_instructions) : 'Idź pieszo',
            operator: 'Pieszy',
            distance: step.distance.text,
            polyline: step.polyline?.points,
        };
    }
}

/**
 * Próbuje znaleźć ID operatora na podstawie nazwy agencji
 */
function findOperatorIdByName(agencyName: string): string | undefined {
    const normalized = agencyName.toLowerCase();
    
    // Mapowanie nazw agencji Google na nasze ID operatorów
    const mappings: Record<string, string> = {
        'pkp intercity': 'pkp-intercity',
        'polregio': 'polregio',
        'koleje mazowieckie': 'koleje-mazowieckie',
        'ztm warszawa': 'ztm-warszawa',
        'metro warszawskie': 'metro-warszawa',
        'mpk kraków': 'mpk-krakow',
        'mpk wrocław': 'mpk-wroclaw',
        'ztm poznań': 'ztm-poznan',
        'ztm gdańsk': 'ztm-gdansk',
        'mpk łódź': 'mpk-lodz',
        'kzk gop': 'kzk-gop',
        'koleje śląskie': 'koleje-slaskie',
        'skm trójmiasto': 'skm-trojmiasto',
        'flixbus': 'flixbus',
        'polskibus': 'polskibus',
    };

    for (const [key, value] of Object.entries(mappings)) {
        if (normalized.includes(key)) {
            return value;
        }
    }

    return undefined;
}

/**
 * Formatuje timestamp Unix na HH:MM
 */
function formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Usuwa tagi HTML z tekstu
 */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

/**
 * Pobiera nazwę lokalizacji (uproszczona wersja)
 */
function getLocationName(location: { lat: number; lng: number }): string {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

/**
 * Oblicza szacunkową cenę podróży
 */
function calculateEstimatedPrice(legs: Leg[]): string | undefined {
    let totalPrice = 0;
    let hasPrice = false;

    legs.forEach(leg => {
        if (leg.mode === 'Walk') return;

        // Proste szacowanie cen
        if (leg.mode === 'Train') {
            const distanceMatch = leg.distance?.match(/(\d+)/);
            const km = distanceMatch ? parseInt(distanceMatch[1]) : 50;
            totalPrice += km * 0.30; // ~0.30 PLN/km dla pociągów
            hasPrice = true;
        } else if (leg.mode === 'Bus' || leg.mode === 'Tram' || leg.mode === 'Subway') {
            totalPrice += 4.40; // Średnia cena biletu miejskiego
            hasPrice = true;
        }
    });

    return hasPrice ? `~${totalPrice.toFixed(2)} PLN` : undefined;
}

/**
 * Pobiera sugestie miejsc z Google Places Autocomplete
 */
export const getGooglePlaceSuggestions = async (
    query: string,
    userLocation?: Geolocation
): Promise<string[]> => {
    try {
        const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
        url.searchParams.append('input', query);
        url.searchParams.append('types', 'geocode|transit_station|establishment');
        url.searchParams.append('components', 'country:pl');
        url.searchParams.append('language', 'pl');
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

        if (userLocation) {
            url.searchParams.append('location', `${userLocation.lat},${userLocation.lng}`);
            url.searchParams.append('radius', '50000'); // 50km radius
        }

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
            return data.predictions?.map((p: any) => p.description) || [];
        }

        throw new Error(`Google Places API error: ${data.status}`);
    } catch (error) {
        console.error('Error fetching place suggestions:', error);
        throw error;
    }
};

/**
 * Pobiera szczegóły przystanku
 */
export const getStopDetails = async (placeId: string): Promise<Stop | null> => {
    try {
        const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        url.searchParams.append('place_id', placeId);
        url.searchParams.append('fields', 'name,geometry,formatted_address');
        url.searchParams.append('language', 'pl');
        url.searchParams.append('key', GOOGLE_MAPS_API_KEY);

        const response = await fetch(url.toString());
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
            const result = data.result;
            return {
                name: result.name,
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                time: '',
            };
        }

        return null;
    } catch (error) {
        console.error('Error fetching stop details:', error);
        return null;
    }
};
