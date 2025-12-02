import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TransitRoute } from '../services/transitService';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X } from 'lucide-react';
import polyline from 'polyline-encoded';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

if (!MAPBOX_TOKEN) {
  console.error('Mapbox token is missing. Please set VITE_MAPBOX_TOKEN in your .env file');
}

interface InlineTransitMapProps {
  route: TransitRoute;
  isOpen: boolean;
}

const SEGMENT_COLORS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#f97316',
  '#ec4899',
];

export const InlineTransitMap: React.FC<InlineTransitMapProps> = ({ route, isOpen }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    // Check for Mapbox token
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is missing');
      return;
    }

    // Clean up existing map if it exists
    if (map.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current.remove();
      map.current = null;
    }

    // Create new map with dark style 2D
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 10,
      pitch: 0, // 2D view
      bearing: 0, // 2D view
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      if (!map.current) return;

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      // Draw route segments
      route.legs.forEach((leg, legIndex) => {
        const color = SEGMENT_COLORS[legIndex % SEGMENT_COLORS.length];

        // Draw polyline if available
        if (leg.polyline) {
          try {
            const coordinates = polyline.decode(leg.polyline);
            const lineCoordinates = coordinates.map(([lat, lng]: [number, number]) => [lng, lat]);

            // Extend bounds
            lineCoordinates.forEach(coord => {
              bounds.extend(coord as [number, number]);
              hasPoints = true;
            });

            const sourceId = `route-${legIndex}`;
            const layerId = `route-layer-${legIndex}`;

            // Add source
            if (!map.current?.getSource(sourceId)) {
              map.current?.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: lineCoordinates,
                  },
                },
              });

              // Add layer
              map.current?.addLayer({
                id: layerId,
                type: 'line',
                source: sourceId,
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': color,
                  'line-width': 5,
                  'line-opacity': 0.9,
                },
              });
            }
          } catch (error) {
            console.warn('Failed to decode polyline for leg', legIndex, error);
          }
        }

        // Add start marker
        if (leg.startLocation) {
          bounds.extend([leg.startLocation.lng, leg.startLocation.lat]);
          hasPoints = true;

          const el = document.createElement('div');
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = color;
          el.style.border = '3px solid white';
          el.style.boxShadow = `0 2px 8px ${color}80`;

          const marker = new mapboxgl.Marker(el)
            .setLngLat([leg.startLocation.lng, leg.startLocation.lat])
            .addTo(map.current!);

          markersRef.current.push(marker);
        }

        // Add end marker (only for last leg)
        if (leg.endLocation && legIndex === route.legs.length - 1) {
          bounds.extend([leg.endLocation.lng, leg.endLocation.lat]);
          hasPoints = true;

          const el = document.createElement('div');
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#ef4444';
          el.style.border = '4px solid white';
          el.style.boxShadow = '0 4px 16px rgba(239,68,68,0.6)';

          const marker = new mapboxgl.Marker(el)
            .setLngLat([leg.endLocation.lng, leg.endLocation.lat])
            .addTo(map.current!);

          markersRef.current.push(marker);
        }
      });

      // Fit bounds to show entire route
      if (hasPoints && !bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1500,
          maxZoom: 15,
        });
      }

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [isOpen, route]);

  if (!isOpen) return null;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center rounded-xl" style={{ backgroundColor: 'transparent' }}>
        <div className="text-center">
          <p className="text-white/60 mb-2">Mapbox token is missing</p>
          <p className="text-white/40 text-sm">Please set VITE_MAPBOX_TOKEN in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-xl">
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full" 
        style={{ borderRadius: '0.75rem' }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: 'transparent' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}

      {/* Route info overlay */}
      {mapLoaded && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="p-3 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-1">{route.summary}</h3>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <Navigation className="w-3 h-3" />
              <span>{route.totalDistance} • {route.totalDuration}</span>
        </div>
      </div>
        </div>
      )}
    </div>
  );
};
