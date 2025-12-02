import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  lat: number;
  lng: number;
  completed?: boolean;
  verified?: boolean;
  reward?: number;
}

interface MapComponentProps {
  quests: Quest[];
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  onQuestClick?: (quest: Quest) => void;
  showRoute?: boolean;
}

const questTypeColors: Record<string, string> = {
  food: '#f97316', // orange
  culture: '#a855f7', // purple
  nature: '#10b981', // green
  nightlife: '#06b6d4', // cyan
  fun: '#ec4899', // pink
};

export const MapComponent: React.FC<MapComponentProps> = ({
  quests,
  origin,
  destination,
  onQuestClick,
  showRoute = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    let mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
    
    // Check if token is secret (sk.*) and use public token instead
    if (mapboxToken && mapboxToken.startsWith('sk.')) {
      console.warn('Mapbox: Secret token detected, using public token fallback');
      mapboxToken = 'pk.eyJ1IjoicGFoaXYiLCJhIjoiY21ocm1pbDl6MDlxbDJxc2RmZTFxanhhdyJ9.0NYhap2uwOXs6slRCnKS4g';
    }
    
    if (!mapboxToken) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: quests.length > 0 ? [quests[0].lng, quests[0].lat] : [0, 0],
      zoom: quests.length > 0 ? 12 : 2,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when quests change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add quest markers
    quests.forEach((quest) => {
      if (!quest.lat || !quest.lng) return;

      const color = quest.completed
        ? '#10b981'
        : questTypeColors[quest.type] || '#14b8a6';

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '16px';

      // Add quest type icon
      const icons: Record<string, string> = {
        food: '🍕',
        culture: '🏛️',
        nature: '🌳',
        nightlife: '🌙',
        fun: '🎭',
      };
      el.textContent = quest.completed ? '✓' : icons[quest.type] || '📍';

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([quest.lng, quest.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a1a;">${quest.title}</h3>
              <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${quest.description}</p>
              ${quest.reward ? `<div style="color: #f59e0b; font-weight: 600;">Reward: ${quest.reward} TPX</div>` : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      // Add click handler
      if (onQuestClick) {
        el.addEventListener('click', () => {
          onQuestClick(quest);
        });
      }

      markersRef.current.push(marker);
    });

    // Add origin marker
    if (origin) {
      const originEl = document.createElement('div');
      originEl.className = 'origin-marker';
      originEl.style.width = '24px';
      originEl.style.height = '24px';
      originEl.style.borderRadius = '50%';
      originEl.style.backgroundColor = '#3b82f6';
      originEl.style.border = '3px solid white';
      originEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

      const originMarker = new mapboxgl.Marker(originEl)
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new mapboxgl.Popup().setText('Origin'))
        .addTo(map.current!);

      markersRef.current.push(originMarker);
    }

    // Add destination marker
    if (destination) {
      const destEl = document.createElement('div');
      destEl.className = 'destination-marker';
      destEl.style.width = '24px';
      destEl.style.height = '24px';
      destEl.style.borderRadius = '50%';
      destEl.style.backgroundColor = '#ef4444';
      destEl.style.border = '3px solid white';
      destEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';

      const destMarker = new mapboxgl.Marker(destEl)
        .setLngLat([destination.lng, destination.lat])
        .setPopup(new mapboxgl.Popup().setText('Destination'))
        .addTo(map.current!);

      markersRef.current.push(destMarker);
    }

    // Fit bounds to show all markers
    if (quests.length > 0 || origin || destination) {
      const bounds = new mapboxgl.LngLatBounds();

      quests.forEach((quest) => {
        if (quest.lat && quest.lng) {
          bounds.extend([quest.lng, quest.lat]);
        }
      });

      if (origin) bounds.extend([origin.lng, origin.lat]);
      if (destination) bounds.extend([destination.lng, destination.lat]);

      if (bounds.isEmpty() === false) {
        map.current!.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        });
      }
    }
  }, [quests, origin, destination, mapLoaded, onQuestClick]);

  // Add route line if showRoute is true
  useEffect(() => {
    if (!map.current || !mapLoaded || !showRoute || quests.length < 2) return;

    // Simple route: connect quests in order
    const coordinates = quests
      .filter((q) => q.lat && q.lng)
      .map((q) => [q.lng, q.lat] as [number, number]);

    if (coordinates.length < 2) return;

    const sourceId = 'route';
    const layerId = 'route-line';

    // Remove existing route if any
    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    // Add route source and layer
    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    });

    map.current.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#3b82f6',
        'line-width': 3,
        'line-dasharray': [2, 2],
      },
    });

    // Animate the dash array
    let offset = 0;
    const animateRoute = () => {
      offset = (offset + 0.5) % 4;
      map.current?.setPaintProperty(layerId, 'line-dasharray', [offset, 4 - offset]);
      requestAnimationFrame(animateRoute);
    };
    animateRoute();
  }, [quests, showRoute, mapLoaded]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full rounded-2xl overflow-hidden"
    >
      <div ref={mapContainer} className="w-full h-full" />
    </motion.div>
  );
};

