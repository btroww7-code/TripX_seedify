
import React, { useEffect, useRef } from 'react';
import { Journey } from '../types';
import L from 'leaflet';
import * as polyline from 'polyline-encoded';

// FIX: Default Leaflet icon was not loading from CDN.
// Set up default icon paths to point to CDN to ensure markers are visible.
let DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


interface InteractiveMapProps {
    journey: Journey;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ journey }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const featureGroupRef = useRef<L.FeatureGroup | null>(null);

    // Initialize map on component mount
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current, {
                zoomControl: false // Optional: for a cleaner look
            }).setView([52.23, 21.01], 6); // Default view (Warsaw, Poland)

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapRef.current);
            
            // Add zoom control to a different position
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        }
    }, []);

    // Update map with new journey data when it changes
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !journey) return;

        // Use a feature group to easily clear old layers and fit bounds
        if (featureGroupRef.current) {
            featureGroupRef.current.clearLayers();
        } else {
            featureGroupRef.current = L.featureGroup().addTo(map);
        }

        // Decode polyline and add to the map
        if (journey.routePolyline) {
            try {
                const coordinates = polyline.decode(journey.routePolyline) as L.LatLngExpression[];
                if (coordinates.length > 0) {
                    L.polyline(coordinates, { color: '#06b6d4', weight: 5, opacity: 0.8 }).addTo(featureGroupRef.current);
                }
            } catch (error) {
                console.error("Failed to decode polyline:", error);
            }
        }
        
        // Add markers for all stops
        journey.stops.forEach((stop, index) => {
             L.marker([stop.lat, stop.lng])
                .addTo(featureGroupRef.current!)
                .bindPopup(`<b>${stop.name}</b><br>Godzina: ${stop.time}`);
        });

        // Fit map bounds to the entire journey
        if (featureGroupRef.current.getLayers().length > 0) {
            // Use setTimeout to ensure the map size is correctly calculated after render
            setTimeout(() => {
                map.fitBounds(featureGroupRef.current!.getBounds(), { padding: [40, 40] });
            }, 100);
        }

    }, [journey]);

    return <div ref={mapContainerRef} className="w-full h-full" />;
};
