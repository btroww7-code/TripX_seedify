import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TransitRoute, TransitLeg } from '../services/transitService';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation } from 'lucide-react';
import polyline from 'polyline-encoded';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface AnimatedTransitMapProps {
  route: TransitRoute;
  onClose: () => void;
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

export const AnimatedTransitMap: React.FC<AnimatedTransitMapProps> = ({ route, onClose }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [0, 0],
      zoom: 12,
      pitch: 45,
      bearing: 0,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      route.legs.forEach((leg, legIndex) => {
        const color = SEGMENT_COLORS[legIndex % SEGMENT_COLORS.length];

        if (leg.polyline) {
          try {
            const coordinates = polyline.decode(leg.polyline);
            const lineCoordinates = coordinates.map(([lat, lng]: [number, number]) => [lng, lat]);

            lineCoordinates.forEach(coord => {
              bounds.extend(coord as [number, number]);
              hasPoints = true;
            });

            const sourceId = `route-${legIndex}`;
            const layerId = `route-layer-${legIndex}`;

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
                  'line-width': 6,
                  'line-opacity': 0.8,
                },
              });

              map.current?.on('mouseenter', layerId, () => {
                if (map.current) map.current.getCanvas().style.cursor = 'pointer';
                setHoveredSegment(legIndex);
              });

              map.current?.on('mouseleave', layerId, () => {
                if (map.current) map.current.getCanvas().style.cursor = '';
                setHoveredSegment(null);
              });

              map.current?.on('click', layerId, () => {
                setSelectedSegment(legIndex === selectedSegment ? null : legIndex);
              });
            }
          } catch (error) {
            console.warn('Failed to decode polyline for leg', legIndex, error);
          }
        }

        if (leg.startLocation) {
          bounds.extend([leg.startLocation.lng, leg.startLocation.lat]);
          hasPoints = true;

          const el = document.createElement('div');
          el.className = 'transit-marker';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = color;
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
          el.style.cursor = 'pointer';
          el.style.transition = 'transform 0.3s ease';

          el.addEventListener('mouseenter', () => {
            el.style.transform = 'scale(1.3)';
            setHoveredSegment(legIndex);
          });

          el.addEventListener('mouseleave', () => {
            el.style.transform = 'scale(1)';
            setHoveredSegment(null);
          });

          el.addEventListener('click', () => {
            setSelectedSegment(legIndex === selectedSegment ? null : legIndex);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([leg.startLocation.lng, leg.startLocation.lat])
            .addTo(map.current!);

          markersRef.current.push(marker);
        }

        if (leg.endLocation && legIndex === route.legs.length - 1) {
          bounds.extend([leg.endLocation.lng, leg.endLocation.lat]);
          hasPoints = true;

          const el = document.createElement('div');
          el.className = 'transit-marker-end';
          el.style.width = '28px';
          el.style.height = '28px';
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

      if (hasPoints) {
        map.current?.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 1500,
        });
      }

      setTimeout(() => {
        route.legs.forEach((_, legIndex) => {
          const layerId = `route-layer-${legIndex}`;
          if (map.current?.getLayer(layerId)) {
            animateRoute(legIndex, legIndex * 500);
          }
        });
      }, 1000);
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [route]);

  useEffect(() => {
    if (!map.current) return;

    route.legs.forEach((_, legIndex) => {
      const layerId = `route-layer-${legIndex}`;
      if (map.current?.getLayer(layerId)) {
        const isSelected = legIndex === selectedSegment;
        const isHovered = legIndex === hoveredSegment;

        map.current.setPaintProperty(
          layerId,
          'line-width',
          isSelected ? 10 : isHovered ? 8 : 6
        );

        map.current.setPaintProperty(
          layerId,
          'line-opacity',
          isSelected ? 1 : isHovered ? 0.9 : 0.8
        );
      }
    });
  }, [selectedSegment, hoveredSegment]);

  const animateRoute = (legIndex: number, delay: number) => {
    const layerId = `route-layer-${legIndex}`;
    if (!map.current?.getLayer(layerId)) return;

    setTimeout(() => {
      let progress = 0;
      const duration = 2000;
      const startTime = Date.now();

      const animate = () => {
        if (!map.current) return;

        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);

        const easedProgress = 1 - Math.pow(1 - progress, 3);

        map.current.setPaintProperty(layerId, 'line-gradient', [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0,
          'rgba(255, 255, 255, 0)',
          easedProgress - 0.1,
          'rgba(255, 255, 255, 0)',
          easedProgress,
          SEGMENT_COLORS[legIndex % SEGMENT_COLORS.length],
          1,
          SEGMENT_COLORS[legIndex % SEGMENT_COLORS.length],
        ]);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      animate();
    }, delay);
  };

  const selectedLeg = selectedSegment !== null ? route.legs[selectedSegment] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={mapContainer} className="absolute inset-0" />

        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-xl backdrop-blur-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <div className="absolute top-4 left-4 z-10 max-w-sm">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl backdrop-blur-xl bg-black/60 border border-white/10 shadow-xl"
          >
            <h3 className="text-lg font-bold text-white mb-2">{route.summary}</h3>
            <div className="space-y-1 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                <span>{route.totalDistance} • {route.totalDuration}</span>
              </div>
              <div className="text-xs text-white/60">
                {route.departureTime} → {route.arrivalTime}
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {selectedLeg && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-4 left-4 right-4 z-10 max-h-48 overflow-y-auto"
            >
              <div className="p-5 rounded-xl backdrop-blur-xl bg-black/70 border border-white/10 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div
                    className="w-3 h-full min-h-[60px] rounded-full"
                    style={{
                      backgroundColor: SEGMENT_COLORS[selectedSegment! % SEGMENT_COLORS.length],
                    }}
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white mb-2">
                      {selectedLeg.mode === 'WALKING'
                        ? 'Walking'
                        : selectedLeg.transitDetails?.line?.shortName || selectedLeg.mode}
                    </h4>
                    {selectedLeg.transitDetails && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-white/90">
                          <MapPin className="w-4 h-4 text-green-400" />
                          <span>{selectedLeg.transitDetails.departureStop.name}</span>
                          <span className="text-white/60">{selectedLeg.transitDetails.departureTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/90">
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span>{selectedLeg.transitDetails.arrivalStop.name}</span>
                          <span className="text-white/60">{selectedLeg.transitDetails.arrivalTime}</span>
                        </div>
                        <div className="text-white/70">
                          {selectedLeg.transitDetails.numStops} stops • {selectedLeg.duration}
                        </div>
                        {selectedLeg.transitDetails.headsign && (
                          <div className="text-white/60 italic">
                            Direction: {selectedLeg.transitDetails.headsign}
                          </div>
                        )}
                      </div>
                    )}
                    {selectedLeg.mode === 'WALKING' && (
                      <div className="text-sm text-white/80">
                        {selectedLeg.instructions} • {selectedLeg.duration}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-4 right-4 z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            className="flex gap-2 p-3 rounded-xl backdrop-blur-xl bg-black/60 border border-white/10"
          >
            {route.legs.map((leg, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedSegment(index === selectedSegment ? null : index)}
                className="w-4 h-4 rounded-full border-2 border-white transition-all duration-300"
                style={{
                  backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                  opacity: selectedSegment === index ? 1 : hoveredSegment === index ? 0.8 : 0.6,
                  transform: selectedSegment === index ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
