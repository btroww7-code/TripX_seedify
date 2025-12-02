/**
 * Alternatywny serwis Google Maps używający JavaScript SDK
 * To rozwiązanie działa bezpośrednio w przeglądarce bez problemów CORS
 */

import { Journey, Leg, Stop, Geolocation } from '../types/transport';
import { POLISH_TRANSPORT_OPERATORS, getOperatorById } from '../data/operators';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Globalny obiekt Google Maps (załadowany przez script)
declare global {
    interface Window {
        google: any;
        initGoogleMaps: () => void;
    }
}

// Use central Google Maps loader
import { loadGoogleMaps as loadGoogleMapsCentral } from '../lib/googleMapsLoader';

export const loadGoogleMaps = (): Promise<void> => {
    return loadGoogleMapsCentral('places,geometry');
};

/**
 * Pobiera trasy używając Google Maps Directions Service (działa w przeglądarce!)
 */
export const getGoogleDirectionsClient = async (
    from: string,
    to: string,
    dateTime: string
): Promise<Journey[]> => {
    try {
        await loadGoogleMaps();

        const directionsService = new window.google.maps.DirectionsService();
        const departureTime = new Date(dateTime);

        const request = {
            origin: from,
            destination: to,
            travelMode: window.google.maps.TravelMode.TRANSIT,
            transitOptions: {
                departureTime: departureTime,
                modes: [
                    window.google.maps.TransitMode.BUS,
                    window.google.maps.TransitMode.RAIL,
                    window.google.maps.TransitMode.SUBWAY,
                    window.google.maps.TransitMode.TRAIN,
                    window.google.maps.TransitMode.TRAM
                ],
                routingPreference: window.google.maps.TransitRoutePreference.FEWER_TRANSFERS
            },
            provideRouteAlternatives: true,
            region: 'pl',
            language: 'pl'
        };

        return new Promise((resolve, reject) => {
            directionsService.route(request, (result: any, status: any) => {
                if (status === window.google.maps.DirectionsStatus.OK) {
                    const journeys = parseGoogleDirectionsResult(result);
                    resolve(journeys);
                } else {
                    console.error('Directions request failed:', status);
                    reject(new Error(`Nie udało się znaleźć tras: ${status}`));
                }
            });
        });
    } catch (error) {
        console.error('Error in getGoogleDirectionsClient:', error);
        throw error;
    }
};

/**
 * Parsuje wynik z Google Directions do naszego formatu Journey
 */
function parseGoogleDirectionsResult(result: any): Journey[] {
    const journeys: Journey[] = [];

    result.routes.forEach((route: any, routeIndex: number) => {
        const leg = route.legs[0]; // Google zwraca jedną "leg" dla całej trasy
        const steps = leg.steps;

        // Ekstraktujemy nasze "legs" z kroków Google
        const ourLegs: Leg[] = [];
        const allStops: Stop[] = [];

        steps.forEach((step: any) => {
            const parsedLeg = parseGoogleDirectionsStep(step);
            ourLegs.push(parsedLeg);
            
            if (parsedLeg.stops) {
                allStops.push(...parsedLeg.stops);
            }
        });

        // Obliczamy liczbę przesiadek
        const transitLegs = ourLegs.filter(l => l.mode !== 'Walk');
        const transferCount = transitLegs.length > 0 ? transitLegs.length - 1 : 0;

        // Obliczamy całkowity dystans pieszy
        const walkingLegs = ourLegs.filter(l => l.mode === 'Walk');
        const totalWalkingDistance = walkingLegs.reduce((sum, l) => {
            const match = l.distance?.match(/(\d+\.?\d*)/);
            const value = match ? parseFloat(match[1]) : 0;
            // Konwersja metrów na km jeśli potrzeba
            return sum + (l.distance?.includes('m') && !l.distance.includes('km') ? value / 1000 : value);
        }, 0);

        // Generujemy podsumowanie
        const summary = routeIndex === 0 
            ? 'Najszybsza trasa' 
            : transferCount === 0
            ? 'Bez przesiadek'
            : `${transferCount} ${transferCount === 1 ? 'przesiadka' : 'przesiadek'}`;

        // Enkodujemy polilinię całej trasy
        const routePolyline = route.overview_polyline;

        journeys.push({
            summary,
            totalDuration: leg.duration.text,
            totalPrice: calculateEstimatedPrice(ourLegs),
            legs: ourLegs,
            routePolyline: routePolyline,
            stops: allStops,
            transferCount,
            departure_time: leg.departure_time?.text || 'Now',
            arrival_time: leg.arrival_time?.text || 'Unknown',
            walkingDistance: totalWalkingDistance > 0 
                ? `${totalWalkingDistance.toFixed(1)} km` 
                : undefined,
        });
    });

    return journeys;
}

/**
 * Parsuje pojedynczy krok z Google Directions
 */
function parseGoogleDirectionsStep(step: any): Leg {
    const isTransit = step.travel_mode === 'TRANSIT';

    if (isTransit && step.transit) {
        const transit = step.transit;
        const line = transit.line;
        const vehicleType = line.vehicle.type;

        // Mapowanie typów Google na nasze TransportMode
        let mode: any = 'Bus';
        const vehicleTypeLower = vehicleType.toLowerCase();
        
        if (vehicleTypeLower.includes('rail') || vehicleTypeLower.includes('train')) {
            mode = 'Train';
        } else if (vehicleTypeLower.includes('subway') || vehicleTypeLower.includes('metro')) {
            mode = 'Subway';
        } else if (vehicleTypeLower.includes('tram')) {
            mode = 'Tram';
        } else if (vehicleTypeLower.includes('bus')) {
            mode = 'Bus';
        }

        // Próbujemy zmapować operatora
        const agencyName = line.agencies?.[0]?.name || '';
        const operatorId = findOperatorIdByName(agencyName);
        const operator = operatorId ? getOperatorById(operatorId) : null;

        // Przystanki
        const stops: Stop[] = [
            {
                name: transit.departure_stop.name,
                lat: transit.departure_stop.location.lat(),
                lng: transit.departure_stop.location.lng(),
                time: formatGoogleTime(transit.departure_time.value),
                stopType: mode === 'Train' ? 'train_station' : 
                         mode === 'Subway' ? 'metro_station' :
                         mode === 'Tram' ? 'tram_stop' : 'bus_stop',
            },
            {
                name: transit.arrival_stop.name,
                lat: transit.arrival_stop.location.lat(),
                lng: transit.arrival_stop.location.lng(),
                time: formatGoogleTime(transit.arrival_time.value),
                stopType: mode === 'Train' ? 'train_station' : 
                         mode === 'Subway' ? 'metro_station' :
                         mode === 'Tram' ? 'tram_stop' : 'bus_stop',
            },
        ];

        return {
            mode,
            from: transit.departure_stop.name,
            to: transit.arrival_stop.name,
            departureTime: formatGoogleTime(transit.departure_time.value),
            arrivalTime: formatGoogleTime(transit.arrival_time.value),
            duration: step.duration.text,
            details: `${line.short_name || line.name} → ${transit.headsign}`,
            operator: agencyName,
            operatorId: operatorId,
            lineNumber: line.short_name || line.name,
            vehicleType: line.vehicle.name,
            distance: step.distance.text,
            stops,
            polyline: step.polyline?.points,
            bookingUrl: operator?.ticketingUrl,
        };
    } else {
        // Odcinek pieszy
        const startLoc = step.start_location;
        const endLoc = step.end_location;

        return {
            mode: 'Walk',
            from: `${startLoc.lat().toFixed(4)}, ${startLoc.lng().toFixed(4)}`,
            to: `${endLoc.lat().toFixed(4)}, ${endLoc.lng().toFixed(4)}`,
            departureTime: '',
            arrivalTime: '',
            duration: step.duration.text,
            details: stripHtml(step.instructions || 'Idź pieszo'),
            operator: 'Pieszy',
            distance: step.distance.text,
            polyline: step.polyline?.points,
        };
    }
}

/**
 * Formatuje czas Google (Date object) na HH:MM
 */
function formatGoogleTime(date: Date): string {
    return new Date(date).toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Usuwa tagi HTML
 */
function stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

/**
 * Próbuje znaleźć ID operatora na podstawie nazwy
 */
function findOperatorIdByName(agencyName: string): string | undefined {
    const normalized = agencyName.toLowerCase();
    
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
        'skm': 'skm-trojmiasto',
        'flixbus': 'flixbus',
    };

    for (const [key, value] of Object.entries(mappings)) {
        if (normalized.includes(key)) {
            return value;
        }
    }

    return undefined;
}

/**
 * Oblicza szacunkową cenę
 */
function calculateEstimatedPrice(legs: Leg[]): string | undefined {
    let totalPrice = 0;
    let hasPrice = false;

    legs.forEach(leg => {
        if (leg.mode === 'Walk') return;

        if (leg.mode === 'Train') {
            const distanceMatch = leg.distance?.match(/(\d+)/);
            const km = distanceMatch ? parseInt(distanceMatch[1]) : 50;
            totalPrice += km * 0.30;
            hasPrice = true;
        } else if (['Bus', 'Tram', 'Subway'].includes(leg.mode)) {
            totalPrice += 4.40;
            hasPrice = true;
        }
    });

    return hasPrice ? `~${totalPrice.toFixed(2)} PLN` : undefined;
}

/**
 * Pobiera sugestie miejsc używając Places Autocomplete Service
 */
export const getGooglePlaceSuggestionsClient = async (
    query: string,
    userLocation?: Geolocation
): Promise<string[]> => {
    try {
        await loadGoogleMaps();

        // Check if new API is available, fallback to old API
        const useNewAPI = window.google.maps.places?.AutocompleteSuggestionService !== undefined;
        const service = useNewAPI 
            ? new window.google.maps.places.AutocompleteSuggestionService()
            : new window.google.maps.places.AutocompleteService();
        
        const request: any = {
            input: query,
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: 'pl' },
            language: 'pl',
        };

        if (userLocation) {
            // Use locationBias instead of deprecated location/radius
            request.locationBias = {
                circle: {
                    center: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
                    radius: 50000, // 50km
                },
            };
        }

        return new Promise((resolve, reject) => {
            service.getPlacePredictions(request, (predictions: any, status: any) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                    const suggestions = predictions.map((p: any) => p.description);
                    resolve(suggestions);
                } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                    resolve([]);
                } else {
                    reject(new Error(`Places API error: ${status}`));
                }
            });
        });
    } catch (error) {
        console.error('Error in getGooglePlaceSuggestionsClient:', error);
        throw error;
    }
};
