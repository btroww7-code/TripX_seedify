import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../lib/googleMapsLoader';

interface IntegratedMapAnimationProps {
  isSearching: boolean;
  origin?: { lat: number; lng: number; name: string };
  destination?: { lat: number; lng: number; name: string };
}

export const IntegratedMapAnimation: React.FC<IntegratedMapAnimationProps> = ({
  isSearching,
  origin,
  destination,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!mapRef.current || !GOOGLE_MAPS_KEY || !isSearching) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      return;
    }

    let map: any = null;
    let animationFrameId: number | null = null;
    let currentZoom = 6; // Start z wyższego widoku
    const startTime = Date.now();
    const isAnimatingRef = { current: true };


    const initMap = async () => {
      try {
        await loadGoogleMaps();
        const google = (window as any).google;

        // Oblicz centrum między origin a destination
        const center = origin && destination
          ? {
              lat: (origin.lat + destination.lat) / 2,
              lng: (origin.lng + destination.lng) / 2,
            }
          : origin || destination || { lat: 52.2297, lng: 21.0122 }; // Warszawa jako fallback

        // Utwórz mapę w dark theme
        map = new google.maps.Map(mapRef.current!, {
          center,
          zoom: currentZoom,
          mapTypeId: google.maps.MapTypeId.SATELLITE,
          disableDefaultUI: true,
          zoomControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [
            // Dark theme styling - GTA style
            { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#747474' }] },
            {
              featureType: 'administrative.province',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#4b6878' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }],
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#515c6d' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry.fill',
              stylers: [{ color: '#2b3754' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#3e4a5f' }],
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca5b3' }],
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{ color: '#2f3948' }],
            },
            {
              featureType: 'poi',
              elementType: 'geometry',
              stylers: [{ color: '#283142' }],
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#6f7890' }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // Animacja zoomu podczas wyszukiwania - GTA style
        const animateZoom = () => {
          if (!isAnimatingRef.current || !map) return;

          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / 3000, 1); // 3 sekundy animacji

          // Easing - szybki start, powolny koniec
          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
          const easedProgress = easeOutCubic(progress);

          // Zoom od 6 do 11 (płynne przybliżenie)
          currentZoom = 6 + (11 - 6) * easedProgress;

          // Lekkie przesunięcie dla efektu
          const offset = Math.sin(progress * Math.PI) * 0.02;
          const currentCenter = {
            lat: center.lat + offset,
            lng: center.lng + offset * 0.5,
          };

          try {
            map.setZoom(currentZoom);
            map.setCenter(currentCenter);
          } catch (error) {
            console.error('Map animation error:', error);
          }

          if (progress < 1 && isAnimatingRef.current) {
            animationFrameId = requestAnimationFrame(animateZoom);
            animationFrameRef.current = animationFrameId;
          }
        };

        // Start animacji
        setTimeout(() => {
          if (isAnimatingRef.current && map) {
            animateZoom();
          }
        }, 100);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    initMap();

    // Cleanup
    return () => {
      isAnimatingRef.current = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSearching, origin, destination, GOOGLE_MAPS_KEY]);

  if (!isSearching) return null;

  return (
    <div
      ref={mapRef}
      className="fixed inset-0 z-[1] opacity-40 transition-opacity duration-500"
      style={{
        pointerEvents: 'none',
      }}
    />
  );
};

