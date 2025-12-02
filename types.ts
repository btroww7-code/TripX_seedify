// FIX: Updated TransportMode to match the schema from geminiService and transport types.
export type TransportMode = 'Walk' | 'Bus' | 'Tram' | 'Subway' | 'Train' | 'Flight' | 'Scooter' | 'Car' | 'Bike' | 'Taxi' | 'CarSharing' | 'BikeSharing' | 'Ferry';

// FIX: Added Leg interface based on the geminiService schema.
export interface Leg {
    mode: TransportMode;
    details: string;
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    bookingUrl?: string;
    operator: string;
}

// FIX: Added Stop interface based on the geminiService schema.
export interface Stop {
    name: string;
    lat: number;
    lng: number;
    time: string;
}

// FIX: Added Journey interface based on the geminiService schema.
export interface Journey {
    summary: string;
    totalDuration: string;
    totalPrice?: string;
    legs: Leg[];
    routePolyline: string;
    stops: Stop[];
    departure_time: string;
    arrival_time: string;
}

// FIX: Updated Geolocation interface to use `lat` and `lng` for consistency.
export interface Geolocation {
    lat: number;
    lng: number;
}

export interface Hotel {
    name: string;
    location: string;
    coordinates: Geolocation;
    price_per_night: number;
    rating: number;
    description: string;
    photo_url?: string;
    booking_url?: string;
    amenities?: string[];
}

export interface Attraction {
    name: string;
    location: string;
    coordinates: Geolocation;
    price: number;
    rating: number;
    description: string;
    photo_url?: string;
    opening_hours?: string;
    type: string;
}

// ============= TRIP GENERATION TYPES =============
// Unified types for AI-generated trips (Create Trip flow)

export interface TripRequest {
    destination: string;
    days: number;
    budget: 'low' | 'medium' | 'high';
    interests: string[];
}

export interface TripOverview {
    city: string;
    country: string;
    total_estimated_cost: string;
    vibe: string;
}

export interface TripActivity {
    place_name: string;
    description: string;
    time_of_day: 'morning' | 'afternoon' | 'evening';
    duration_hours: number;
    estimated_cost?: number;
    coordinates: Geolocation;
    place_id?: string;
    verified: boolean;
    photo_reference?: string;
}

export interface TripDay {
    day_number: number;
    theme: string;
    activities: TripActivity[];
    attractions: TripActivity[];
}

export interface GeneratedTripPlan {
    trip_overview: TripOverview;
    days: TripDay[];
    daily_plan: TripDay[];
    hotels: Hotel[];
    attractions: Attraction[];
}
