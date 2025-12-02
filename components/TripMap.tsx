import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';
import { createRoot } from 'react-dom/client';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';

interface TripMapProps {
  route: Array<{ lat: number; lng: number; name?: string }>;
  hotels?: Array<{ name: string; coordinates: { lat: number; lng: number }; description?: string; photo_url?: string }>;
  attractions?: Array<{ name: string; coordinates: { lat: number; lng: number }; description?: string; photo_url?: string }>;
  height?: string;
  onNavigateToTransit?: (to: { lat: number; lng: number; name: string }) => void;
}

const PopupContent: React.FC<{
  title: string;
  description?: string;
  image?: string;
  onNavigate?: () => void;
}> = ({ title, description, image, onNavigate }) => (
  <div className="p-2 max-w-xs">
    {image && (
      <img src={image} alt={title} className="w-full h-32 object-cover rounded-lg mb-2" />
    )}
    <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
    {description && <p className="text-xs text-slate-600 mb-2 line-clamp-3">{description}</p>}
    <div className="flex gap-2 mt-2">
      {onNavigate && (
        <button
          onClick={onNavigate}
          className="flex-1 bg-teal-500 text-white text-xs py-1.5 px-3 rounded-md hover:bg-teal-600 transition-colors flex items-center justify-center gap-1"
        >
          <Navigation className="w-3 h-3" />
          Dojazd
        </button>
      )}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 bg-slate-100 text-slate-700 text-xs py-1.5 px-3 rounded-md hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
      >
        <ExternalLink className="w-3 h-3" />
        Maps
      </a>
    </div>
  </div>
);

export const TripMap: React.FC<TripMapProps> = ({
  route,
  hotels = [],
  attractions = [],
  height = '500px',
  onNavigateToTransit,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
    let mapboxToken = 'pk.eyJ1IjoicGFoaXYiLCJhIjoiY21ocm1pbDl6MDlxbDJxc2RmZTFxanhhdyJ9.0NYhap2uwOXs6slRCnKS4g';
    if (envToken && envToken.startsWith('pk.')) {
      mapboxToken = envToken;
    }
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: route.length > 0 ? [route[0].lng, route[0].lat] : [21.0122, 52.2297],
      zoom: 12,
      pitch: 45,
      bearing: -17.6,
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      if (!map.current) return;

      // Add route line
      if (route.length > 1) {
        const coordinates = route.map(p => [p.lng, p.lat]);
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#06b6d4', 'line-width': 4, 'line-opacity': 0.8 },
        });
      }

      // Helper to add markers
      const addMarker = (lng: number, lat: number, color: string, title: string, desc?: string, img?: string) => {
        const popupNode = document.createElement('div');
        const root = createRoot(popupNode);
        root.render(
          <PopupContent
            title={title}
            description={desc}
            image={img}
            onNavigate={() => onNavigateToTransit?.({ lat, lng, name: title })}
          />
        );

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setDOMContent(popupNode);

        new mapboxgl.Marker({ color })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);
      };

      // Add Route Points
      route.forEach((p, i) => {
        addMarker(p.lng, p.lat, i === 0 ? '#10b981' : i === route.length - 1 ? '#ef4444' : '#64748b', p.name || `Point ${i + 1}`);
      });

      // Add Hotels
      hotels.forEach(h => {
        addMarker(h.coordinates.lng, h.coordinates.lat, '#f59e0b', h.name, h.description, h.photo_url);
      });

      // Add Attractions
      attractions.forEach(a => {
        addMarker(a.coordinates.lng, a.coordinates.lat, '#8b5cf6', a.name, a.description, a.photo_url);
      });

      // Fit bounds
      const allPoints = [...route, ...hotels.map(h => ({ lat: h.coordinates.lat, lng: h.coordinates.lng })), ...attractions.map(a => ({ lat: a.coordinates.lat, lng: a.coordinates.lng }))];
      if (allPoints.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allPoints.forEach(p => bounds.extend([p.lng, p.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      map.current?.remove();
    };
  }, [route, hotels, attractions]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      className="relative rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl"
      style={{ height }}
    >
      <div ref={mapContainer} className="w-full h-full" />
    </motion.div>
  );
};
