import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface AttractionMapboxProps {
  latitude: number;
  longitude: number;
  name: string;
  className?: string;
}

export const AttractionMapbox: React.FC<AttractionMapboxProps> = ({
  latitude,
  longitude,
  name,
  className = 'w-full h-64'
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme
      center: [longitude, latitude],
      zoom: 14,
      pitch: 0,
      bearing: 0,
    });

    // Add marker
    const marker = new mapboxgl.Marker({
      color: '#06b6d4', // Cyan color
    })
      .setLngLat([longitude, latitude])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="color: #fff; background: rgba(0,0,0,0.8); padding: 8px; border-radius: 8px;">
            <strong>${name}</strong>
          </div>`
        )
      )
      .addTo(map.current);

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [latitude, longitude, name]);

  return <div ref={mapContainer} className={className} />;
};
