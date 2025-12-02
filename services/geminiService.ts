
import { GoogleGenAI, Type } from "@google/genai";
import { Journey, Geolocation } from '../types';

// Per instructions, API key is from process.env
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// The response schema for a single journey
const journeySchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: 'Krótkie podsumowanie podróży, np. "Najszybsza trasa"' },
        totalDuration: { type: Type.STRING, description: 'Całkowity czas podróży, np. "2h 30m"' },
        totalPrice: { type: Type.STRING, description: 'Szacunkowy całkowity koszt podróży, np. "50 PLN". Opcjonalne.', nullable: true },
        legs: {
            type: Type.ARRAY,
            description: 'Lista odcinków składających się na podróż.',
            items: {
                type: Type.OBJECT,
                properties: {
                    mode: { type: Type.STRING, description: 'Środek transportu.', enum: ['Walk', 'Bus', 'Tram', 'Subway', 'Train', 'Flight', 'Scooter', 'Car'] },
                    from: { type: Type.STRING, description: 'Miejsce początkowe tego odcinka.' },
                    to: { type: Type.STRING, description: 'Miejsce docelowe tego odcinka.' },
                    departureTime: { type: Type.STRING, description: 'Czas odjazdu w formacie HH:MM.' },
                    arrivalTime: { type: Type.STRING, description: 'Czas przyjazdu w formacie HH:MM.' },
                    duration: { type: Type.STRING, description: 'Czas trwania tego odcinka, np. "15m".' },
                    details: { type: Type.STRING, description: 'Dodatkowe szczegóły, np. numer linii, nazwa przewoźnika.' },
                    bookingUrl: { type: Type.STRING, description: 'Link do rezerwacji biletu. Opcjonalne.', nullable: true },
                    operator: { type: Type.STRING, description: 'Nazwa operatora/przewoźnika.' },
                },
                required: ['mode', 'from', 'to', 'departureTime', 'arrivalTime', 'duration', 'details', 'operator']
            }
        },
        routePolyline: { type: Type.STRING, description: 'Zakodowana polilinia całej trasy, do wyświetlenia na mapie.' },
        stops: {
            type: Type.ARRAY,
            description: 'Lista ważnych przystanków/punktów na trasie z ich współrzędnymi.',
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'Nazwa przystanku/punktu.' },
                    lat: { type: Type.NUMBER, description: 'Szerokość geograficzna.' },
                    lng: { type: Type.NUMBER, description: 'Długość geograficzna.' },
                    time: { type: Type.STRING, description: 'Czas dotarcia do tego punktu w formacie HH:MM.' },
                },
                required: ['name', 'lat', 'lng', 'time']
            }
        },
    },
    required: ['summary', 'totalDuration', 'legs', 'routePolyline', 'stops']
};

export const getJourneys = async (
    from: string,
    to: string,
    dateTime: string,
    userLocation?: Geolocation
): Promise<Journey[]> => {
    try {
        // Step 1: Get grounded, factual route information from the model using Google Maps
        const groundedPrompt = `Korzystając z danych Google Maps, znajdź do 3 szczegółowych tras transportem publicznym z ${from} do ${to}, rozpoczynając o ${new Date(dateTime).toLocaleString('pl-PL')}. 
Opisz każdy etap podróży, podając środek transportu, numery linii, nazwy przystanków, czasy odjazdu i przyjazdu. Podaj szacowany całkowity czas podróży i koszt dla każdej trasy.`;

        const groundedResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: groundedPrompt,
            config: {
                tools: [{googleMaps: {}}],
                toolConfig: userLocation ? {
                    retrievalConfig: {
                        latLng: {
                            latitude: userLocation.lat,
                            longitude: userLocation.lng
                        }
                    }
                } : undefined
            },
        });
        
        const groundedText = groundedResponse.text;

        if (!groundedText || groundedText.length < 10) {
            // If the grounded response is empty, return no results.
             return [];
        }

        // Step 2: Format the factual text into the required JSON structure
        const formattingPrompt = `Przeanalizuj poniższy opis trasy i przekonwertuj go na tablicę obiektów JSON zgodną z podanym schematem. 
Upewnij się, że poprawnie identyfikujesz wszystkie etapy ('legs') podróży.
Wygeneruj precyzyjną, zakodowaną polilinię ('routePolyline') dla każdej całej trasy. 
Wygeneruj listę przystanków ('stops') ze współrzędnymi geograficznymi dla każdego kluczowego punktu na trasie (początek, koniec, przesiadki).
Jeśli w opisie jest kilka tras, utwórz osobny obiekt JSON dla każdej z nich. Zawsze zwracaj tablicę, nawet jeśli jest tylko jedna trasa.

Oto opis trasy do przetworzenia:
---
${groundedText}
---`;
        
        const formattingResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: formattingPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: journeySchema
                },
            },
        });
        
        const jsonText = formattingResponse.text.trim();
        const journeys = JSON.parse(jsonText);
        return journeys as Journey[];
    } catch (error) {
        console.error("Error fetching journeys from Gemini API:", error);
        throw new Error("Nie udało się pobrać propozycji podróży. Model AI mógł napotkać problem z interpretacją danych. Spróbuj przeformułować zapytanie.");
    }
};

export const getPlaceSuggestions = async (query: string, userLocation?: Geolocation): Promise<string[]> => {
    if (!query || query.length < 3) {
        return [];
    }
    try {
        const prompt = `Podaj do 5 sugestii autouzupełniania dla miejsca w Polsce, które zaczyna się od "${query}". 
        ${userLocation ? `Nadaj priorytet miejscom w pobliżu lokalizacji użytkownika: lat ${userLocation.lat}, lng ${userLocation.lng}.` : ''}
        Zwróć tylko listę nazw w formacie JSON. Przykład: ["Warszawa, Dworzec Centralny", "Warszawa, Lotnisko Chopina"].`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
        });

        const jsonText = response.text.trim();
        const suggestions = JSON.parse(jsonText);
        return suggestions as string[];

    } catch (error) {
        console.error("Error fetching place suggestions:", error);
        // FIX: Re-throw the error so it can be handled by the central logic in App.tsx,
        // allowing for more intelligent cooldowns based on error type.
        throw error;
    }
};