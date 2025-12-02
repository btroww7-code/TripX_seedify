import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { glassEffects } from '../styles/glassEffects';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationZoomAnimationProps {
  lat: number;
  lng: number;
  name: string;
  onComplete?: () => void;
  questType?: 'sponsored' | 'hidden_gem' | 'standard';
}

export const LocationZoomAnimation: React.FC<LocationZoomAnimationProps> = ({
  lat,
  lng,
  name,
  onComplete,
  questType = 'standard',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMarker, setShowMarker] = useState(false);
  
  // Get Mapbox token - use public token (pk.*) only
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  let mapboxToken = 'pk.eyJ1IjoicGFoaXYiLCJhIjoiY21ocm1pbDl6MDlxbDJxc2RmZTFxanhhdyJ9.0NYhap2uwOXs6slRCnKS4g'; // Default public token
  if (envToken && envToken.startsWith('pk.')) {
    mapboxToken = envToken; // Use public token from env if valid
  } else if (envToken && envToken.startsWith('sk.')) {
    console.warn('Mapbox: Secret token detected in env, using public token instead');
  }
  
  // Get color based on quest type
  const getMarkerColor = () => {
    switch (questType) {
      case 'sponsored': return '#fbbf24';
      case 'hidden_gem': return '#a855f7';
      default: return '#06b6d4';
    }
  };
  
  const markerColor = getMarkerColor();

  useEffect(() => {
    if (!mapRef.current || !mapboxToken) {
      setIsLoading(false);
      return;
    }

    // Set Mapbox access token
    mapboxgl.accessToken = mapboxToken;

    // Initialize Mapbox map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat], // Mapbox uses [lng, lat] format
      zoom: 2, // Start high above (like GTA)
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    mapInstanceRef.current = map;

    // Wait for map to load
    map.on('load', () => {
      setIsLoading(false);
      
      // Add atmospheric fog effect
      map.setFog({
        color: 'rgb(8, 8, 11)',
        'high-color': 'rgb(20, 20, 30)',
        'horizon-blend': 0.1,
        'space-color': 'rgb(0, 0, 0)',
        'star-intensity': 0.3
      });

      // Add CSS animations for marker
      if (!document.getElementById('gta-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'gta-marker-styles';
        style.textContent = `
          @keyframes markerFloat {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-10px) scale(1.05); }
          }
          @keyframes markerPulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.2); }
          }
          .gta-marker-container {
            position: relative;
            width: 60px;
            height: 60px;
            animation: markerFloat 3s ease-in-out infinite;
          }
          .gta-marker-glow {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: radial-gradient(circle, var(--marker-color)80 0%, var(--marker-color)20 50%, transparent 100%);
            animation: markerPulse 2s ease-in-out infinite;
          }
          .gta-marker-core {
            position: absolute;
            width: 40px;
            height: 40px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: var(--marker-color);
            border: 3px solid rgba(255, 255, 255, 0.9);
            box-shadow: 
              0 0 20px var(--marker-color)80,
              0 0 40px var(--marker-color)40,
              inset 0 2px 4px rgba(255, 255, 255, 0.3),
              inset 0 -2px 4px rgba(0, 0, 0, 0.3);
            z-index: 2;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .gta-marker-shadow {
            position: absolute;
            width: 30px;
            height: 10px;
            bottom: -5px;
            left: 50%;
            transform: translateX(-50%);
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.4);
            filter: blur(4px);
            z-index: 1;
          }
        `;
        document.head.appendChild(style);
      }

      // Create animated GTA-style marker
      const createAnimatedMarker = () => {
        const markerDiv = document.createElement('div');
        markerDiv.className = 'gta-marker-container';
        markerDiv.style.setProperty('--marker-color', markerColor);
        markerDiv.innerHTML = `
          <div class="gta-marker-glow"></div>
          <div class="gta-marker-core">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="gta-marker-shadow"></div>
        `;

        const marker = new mapboxgl.Marker({ element: markerDiv })
          .setLngLat([lng, lat])
          .addTo(map);

        markerRef.current = marker;
        setShowMarker(true);
      };

      // Start GTA-style flyTo animation after map loads
      setTimeout(() => {
        // Use Mapbox flyTo for smooth GTA-style animation
        map.flyTo({
          center: [lng, lat],
          zoom: 18,
          pitch: 0,
          bearing: 0,
          duration: 4000, // 4 seconds
          essential: true,
          curve: 1.5, // Spiral effect
        });

        // Show marker when zoom gets close
        map.once('zoom', () => {
          const currentZoom = map.getZoom();
          if (currentZoom > 12 && !showMarker) {
            createAnimatedMarker();
          }
        });

        // Complete animation after flyTo finishes
        setTimeout(() => {
          if (!showMarker) {
            createAnimatedMarker();
          }
          setTimeout(() => {
            if (onComplete) {
              onComplete();
            }
          }, 2000); // Keep map visible for 2 seconds
        }, 4000);
      }, 300);
    });

    // Cleanup
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [lat, lng, mapboxToken, onComplete, markerColor, showMarker]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onComplete}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        <div className="relative w-full h-full">
          {/* Tło z chmurami - efekt widoku z góry (tylko na początku) */}
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: isLoading ? 0.5 : 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 70%),
                          repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)`,
            }}
          />

          {/* Mapa Mapbox */}
          <div
            ref={mapRef}
            className="w-full h-full"
            style={{
              filter: isLoading ? 'blur(15px) brightness(0.7)' : 'blur(0px) brightness(1)',
              transition: 'filter 1s ease-out',
            }}
          />

          {/* Premium Glassmorphic Overlay z nazwą miejsca */}
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-8 left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={glassEffects.inlineStyles.glassStrong}
          >
            <div className="px-8 py-5 rounded-3xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${markerColor}30`,
                    border: `2px solid ${markerColor}60`
                  }}
                >
                  <MapPin className="w-6 h-6" style={{ color: markerColor }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                    {name}
                  </h2>
                  <p className="text-sm text-white/70 mt-1">Quest Location</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Wskaźnik ładowania */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4"
                />
                <p className="text-white text-lg font-medium" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  Loading map...
                </p>
              </div>
            </motion.div>
          )}

          {/* Premium Przycisk zamknięcia */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            onClick={(e) => {
              e.stopPropagation();
              onComplete?.();
            }}
            className="absolute top-6 right-6 p-3 rounded-xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] text-white hover:bg-white/[0.12] hover:border-white/[0.20] transition-all duration-300 shadow-lg hover:scale-110"
            style={{
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)'
            }}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

