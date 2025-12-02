// Typy dla rozszerzonego systemu transportowego w Polsce

export type TransportMode = 
    | 'Walk' 
    | 'Bus' 
    | 'Tram' 
    | 'Subway' 
    | 'Train' 
    | 'Flight' 
    | 'Scooter' 
    | 'Car'
    | 'Bike'
    | 'Taxi'
    | 'CarSharing'
    | 'BikeSharing'
    | 'Ferry';

// Operator transportowy w Polsce
export interface TransportOperator {
    id: string;
    name: string;
    type: 'railway' | 'urban' | 'intercity' | 'regional' | 'airline';
    apiEndpoint?: string;
    ticketingUrl?: string;
    logo?: string;
    regions: string[]; // Województwa gdzie działa operator
}

// Przystanki/Stacje z rozbudowanymi informacjami
export interface Stop {
    id?: string;
    name: string;
    lat: number;
    lng: number;
    time: string;
    platform?: string;
    track?: string;
    stopType?: 'bus_stop' | 'tram_stop' | 'train_station' | 'metro_station' | 'airport';
}

// Etap podróży (Leg) z dodatkowymi informacjami
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
    operatorId?: string;
    lineNumber?: string;
    vehicleType?: string;
    distance?: string;
    price?: string;
    stops?: Stop[]; // Wszystkie przystanki na tym etapie
    polyline?: string; // Polilinia dla tego konkretnego etapu
    realTimeData?: {
        delay?: number; // Opóźnienie w minutach
        platform?: string;
        vehicleId?: string;
    };
}

// Podróż (Journey) z rozszerzonymi danymi
export interface Journey {
    summary: string;
    totalDuration: string;
    totalPrice?: string;
    departure_time: string;
    arrival_time: string;
    legs: Leg[];
    routePolyline: string;
    stops: Stop[];
    transferCount?: number; // Liczba przesiadek
    walkingDistance?: string; // Całkowity dystans pieszych odcinków
    emissions?: string; // Ślad węglowy
    accessibility?: string[]; // Informacje o dostępności dla osób z niepełnosprawnościami
}

export interface Geolocation {
    lat: number;
    lng: number;
}

// Konfiguracja wyszukiwania
export interface SearchConfig {
    from: string;
    to: string;
    dateTime: string;
    preferences?: {
        maxTransfers?: number;
        modes?: TransportMode[];
        operators?: string[];
        accessibility?: boolean;
        cheapest?: boolean; // Szukaj najtańszych opcji
        fastest?: boolean; // Szukaj najszybszych opcji
    };
}

// Dane czasu rzeczywistego z API operatora
export interface RealTimeData {
    vehicleId: string;
    operator: string;
    line: string;
    delay: number;
    position?: Geolocation;
    nextStop?: string;
    timestamp: string;
}

// Bilet
export interface Ticket {
    id: string;
    operator: string;
    type: 'single' | 'return' | 'period' | 'combined';
    price: string;
    validFrom: string;
    validUntil: string;
    zones?: string[];
    qrCode?: string;
    purchaseUrl: string;
}
