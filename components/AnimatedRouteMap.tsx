import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion } from 'framer-motion';

interface AnimatedRouteMapProps {
  route: Array<{ lat: number; lng: number; name?: string }>;
  origin?: { lat: number; lng: number; name?: string };
  destination?: { lat: number; lng: number; name?: string };
  height?: string;
  showAnimation?: boolean;
}

export const AnimatedRouteMap: React.FC<AnimatedRouteMapProps> = ({
  route,
  origin,
  destination,
  height = '500px',
  showAnimation = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Get Mapbox token - use public token (pk.*) only
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
    let mapboxToken = 'pk.eyJ1IjoicGFoaXYiLCJhIjoiY21ocm1pbDl6MDlxbDJxc2RmZTFxanhhdyJ9.0NYhap2uwOXs6slRCnKS4g'; // Default public token
    if (envToken && envToken.startsWith('pk.')) {
      mapboxToken = envToken; // Use public token from env if valid
    } else if (envToken && envToken.startsWith('sk.')) {
      console.warn('Mapbox: Secret token detected in env, using public token instead');
    }
    mapboxgl.accessToken = mapboxToken;

    // Initialize map with dark theme
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11', // Dark theme
      center: route.length > 0 ? [route[0].lng, route[0].lat] : [21.0122, 52.2297], // Warszawa default
      zoom: route.length > 1 ? 12 : 13,
      pitch: 45,
      bearing: -17.6,
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      
      if (!map.current) return;

      // Add route line with all points
      if (route.length > 0) {
        const coordinates = route.map(point => [point.lng, point.lat] as [number, number]);
        
        // If we have origin and destination, include them in the route
        const allCoordinates: [number, number][] = [];
        if (origin) {
          allCoordinates.push([origin.lng, origin.lat]);
        }
        allCoordinates.push(...coordinates);
        if (destination && destination.lat !== origin?.lat && destination.lng !== origin?.lng) {
          allCoordinates.push([destination.lng, destination.lat]);
        }
        
        // Ensure we have at least 2 points for a line
        if (allCoordinates.length < 2 && coordinates.length >= 2) {
          // Use coordinates directly if we don't have origin/destination
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coordinates,
              },
            },
          });
        } else if (allCoordinates.length >= 2) {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: allCoordinates,
              },
            },
          });
        }

        // Add route line layer only if source exists
        if (map.current.getSource('route')) {
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#06b6d4',
              'line-width': 4,
              'line-opacity': 0.8,
            },
          });
        }

        // Add animated route line
        if (showAnimation && map.current.getSource('route')) {
          const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
          const routeData = routeSource._data as any;
          const routeCoords = routeData.geometry.coordinates as [number, number][];
          
          map.current.addLayer({
            id: 'route-animated',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': '#10b981',
              'line-width': 6,
              'line-opacity': 1,
              'line-dasharray': [2, 2],
            },
          });

          // Animate route drawing
          let progress = 0;
          const animateRoute = () => {
            if (!map.current) return;
            
            progress += 0.02;
            if (progress > 1) progress = 0;

            const lineDistance = routeCoords.reduce((acc, coord, i) => {
              if (i === 0) return acc;
              const prev = routeCoords[i - 1];
              const dx = coord[0] - prev[0];
              const dy = coord[1] - prev[1];
              return acc + Math.sqrt(dx * dx + dy * dy);
            }, 0);

            let currentDistance = lineDistance * progress;
            let currentCoordinates: [number, number][] = [];
            let accumulatedDistance = 0;

            for (let i = 0; i < routeCoords.length - 1; i++) {
              const start = routeCoords[i];
              const end = routeCoords[i + 1];
              const segmentDistance = Math.sqrt(
                Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
              );

              if (accumulatedDistance + segmentDistance >= currentDistance) {
                const segmentProgress = (currentDistance - accumulatedDistance) / segmentDistance;
                const currentPoint: [number, number] = [
                  start[0] + (end[0] - start[0]) * segmentProgress,
                  start[1] + (end[1] - start[1]) * segmentProgress,
                ];
                currentCoordinates.push(...routeCoords.slice(0, i + 1), currentPoint);
                break;
              }

              accumulatedDistance += segmentDistance;
            }

            if (currentCoordinates.length === 0) {
              currentCoordinates = routeCoords;
            }

            const source = map.current.getSource('route-animated') as mapboxgl.GeoJSONSource;
            if (source) {
              source.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: currentCoordinates,
                },
              });
            }

            animationFrameRef.current = requestAnimationFrame(animateRoute);
          };

          animateRoute();
        }
      }

      // Add origin marker
      if (origin) {
        new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat([origin.lng, origin.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<div class="text-black font-semibold">📍 ${origin.name || 'Start'}</div>`))
          .addTo(map.current);
      }

      // Add destination marker
      if (destination) {
        new mapboxgl.Marker({ color: '#06b6d4' })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<div class="text-black font-semibold">🎯 ${destination.name || 'Cel'}</div>`))
          .addTo(map.current);
      }

      // Add route point markers
      route.forEach((point, index) => {
        if (point.name && point !== origin && point !== destination) {
          new mapboxgl.Marker({ color: '#64748b', scale: 0.8 })
            .setLngLat([point.lng, point.lat])
            .setPopup(new mapboxgl.Popup().setHTML(`<div class="text-black text-sm">${point.name}</div>`))
            .addTo(map.current);
        }
      });

      // Fit map to route bounds
      const allPoints: Array<{ lat: number; lng: number }> = [];
      if (origin) allPoints.push(origin);
      allPoints.push(...route);
      if (destination) allPoints.push(destination);
      
      if (allPoints.length > 1) {
        const bounds = allPoints.reduce(
          (bounds, point) => bounds.extend([point.lng, point.lat]),
          new mapboxgl.LngLatBounds([allPoints[0].lng, allPoints[0].lat], [allPoints[0].lng, allPoints[0].lat])
        );

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 2000,
        });
      } else if (route.length > 0) {
        // Fallback: center on first route point
        map.current.flyTo({
          center: [route[0].lng, route[0].lat],
          zoom: 13,
          duration: 1000,
        });
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [route, origin, destination, showAnimation]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isLoaded ? 1 : 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl"
      style={{ height, backdropFilter: 'blur(20px)' }}
    >
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="text-white">Ładowanie mapy...</div>
        </div>
      )}
    </motion.div>
  );
};

