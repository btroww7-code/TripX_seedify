import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Quest } from '../services/questService';
import { MapPin, X, Trophy, Star, CheckCircle2 } from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { startQuest as startQuestService } from '../services/questService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

interface QuestMapProps {
  quests: Quest[];
  userLocation?: { lat: number; lng: number };
  onQuestSelect?: (quest: Quest) => void;
  height?: string;
  questToZoom?: Quest | null;
  onZoomComplete?: () => void;
  onAcceptQuest?: (quest: Quest) => void;
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#10b981',
  2: '#3b82f6',
  3: '#f59e0b',
  4: '#ef4444',
  5: '#8b5cf6',
};

export const QuestMap: React.FC<QuestMapProps> = ({
  quests,
  userLocation,
  onQuestSelect,
  height = '600px',
  questToZoom,
  onZoomComplete,
  onAcceptQuest,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const isZoomingRef = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(2.5);
  const previousQuestRef = useRef<Quest | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;

  // Setup quests as GeoJSON source with Mapbox layers
  const setupQuestsLayer = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing layers and sources
    if (map.current.getLayer('quests-circles')) {
      map.current.removeLayer('quests-circles');
    }
    if (map.current.getLayer('quests-labels')) {
      map.current.removeLayer('quests-labels');
    }
    if (map.current.getSource('quests')) {
      map.current.removeSource('quests');
    }

    if (quests.length === 0) return;

    // Create GeoJSON features from quests
    const features = quests
      .filter(quest => quest.latitude && quest.longitude)
      .map(quest => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [quest.longitude, quest.latitude] as [number, number],
        },
        properties: {
          id: quest.id,
          difficulty: quest.difficulty,
          quest_type: quest.quest_type || 'standard',
          title: quest.title,
          location: quest.location,
          description: quest.description,
          reward_tokens: quest.reward_tokens,
          reward_xp: quest.reward_xp,
        },
      }));

    // Add GeoJSON source
    map.current.addSource('quests', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features,
      },
    });

    // Add circle layer for quest points
    map.current.addLayer({
      id: 'quests-circles',
      type: 'circle',
      source: 'quests',
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2, 4,  // At zoom 2, radius 4
          5, 8,  // At zoom 5, radius 8
          10, 12, // At zoom 10, radius 12
          14, 16, // At zoom 14, radius 16
        ],
        'circle-color': [
          'match',
          ['get', 'difficulty'],
          1, DIFFICULTY_COLORS[1],
          2, DIFFICULTY_COLORS[2],
          3, DIFFICULTY_COLORS[3],
          4, DIFFICULTY_COLORS[4],
          5, DIFFICULTY_COLORS[5],
          DIFFICULTY_COLORS[1], // default
        ],
        'circle-stroke-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          2, 1,
          5, 2,
          10, 3,
          14, 4,
        ],
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Add symbol layer for labels (only at higher zoom)
    map.current.addLayer({
      id: 'quests-labels',
      type: 'symbol',
      source: 'quests',
      layout: {
        'text-field': ['get', 'title'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 1.5],
        'text-anchor': 'top',
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 10,
          14, 12,
        ],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 2,
        'text-halo-blur': 1,
      },
      minzoom: 10, // Only show labels at zoom 10+
    });

    // Add click handler
    map.current.on('click', 'quests-circles', (e) => {
      if (e.features && e.features[0]) {
        const questId = e.features[0].properties?.id;
        const quest = quests.find(q => q.id === questId);
        if (quest) {
          // Always trigger quest select to open full modal
          // Small modal will only show after zoom animation completes
          if (onQuestSelect) {
            onQuestSelect(quest);
          }
        }
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'quests-circles', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'quests-circles', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = '';
      }
    });
  }, [quests, mapLoaded, onQuestSelect]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check for Mapbox token
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token is missing. Please set VITE_MAPBOX_TOKEN in your .env file');
      return;
    }

    // Start with globe view (zoom 2-3) centered on [0, 0] or center of all quests
    let initialCenter: [number, number] = [0, 0];
    if (quests.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      quests.forEach((quest) => {
        if (quest.latitude && quest.longitude) {
          bounds.extend([quest.longitude, quest.latitude]);
        }
      });
      if (!bounds.isEmpty()) {
        const center = bounds.getCenter();
        initialCenter = [center.lng, center.lat];
      }
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: initialCenter,
      zoom: 2.5, // Globe view
      pitch: 0, // 2D view
      bearing: 0,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
      setCurrentZoom(map.current!.getZoom());
      // Initial setup: show all quests on globe view
      if (quests.length > 0) {
        // Small delay to ensure map is fully loaded
        setTimeout(() => {
          if (map.current) {
            setupQuestsLayer();
          }
        }, 100);
      }
    });

    // Track zoom level
    map.current.on('zoom', () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      if (map.current) {
        // Remove layers and sources
        if (map.current.getLayer('quests-circles')) {
          map.current.removeLayer('quests-circles');
        }
        if (map.current.getLayer('quests-labels')) {
          map.current.removeLayer('quests-labels');
        }
        if (map.current.getSource('quests')) {
          map.current.removeSource('quests');
        }
        map.current.remove();
        map.current = null;
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      setMapLoaded(false);
    };
  }, []);

  // Update quests layer when quests change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Don't reset if we're zooming to a quest
    if (questToZoom || isZoomingRef.current) return;

    setupQuestsLayer();
  }, [quests, mapLoaded, questToZoom, setupQuestsLayer]);

  // Handle quest zoom animation with two-phase approach
  useEffect(() => {
    if (!map.current || !mapLoaded || !questToZoom) return;

    const quest = questToZoom;
    if (!quest.latitude || !quest.longitude) return;

    // Check if this is a different quest (switching)
    const isSwitching = previousQuestRef.current && 
                       previousQuestRef.current.id !== quest.id;

    isZoomingRef.current = true;

    // Stop any ongoing animations
    map.current.stop();

    // Two-phase animation: zoom out to globe, then zoom in to quest
    const currentZoomLevel = map.current.getZoom();
    
    // Phase 1: Zoom out to globe view (zoom 2) if switching quests or if already zoomed in
    if (isSwitching || currentZoomLevel > 3) {
      map.current.flyTo({
        center: [quest.longitude, quest.latitude],
        zoom: 2,
        pitch: 0,
        bearing: 0,
        duration: 1000,
        essential: true,
        easing: (t: number) => {
          // EaseInOutCubic
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        },
      });

      // Phase 2: After zoom out completes, zoom in to quest location
      map.current.once('moveend', () => {
        if (!map.current) return;
        
        map.current.flyTo({
          center: [quest.longitude, quest.latitude],
          zoom: 17,
          pitch: 0,
          bearing: 0,
          duration: 2000,
          essential: true,
          easing: (t: number) => {
            // EaseInOutCubic
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          },
        });

        // After zoom in completes
        map.current.once('moveend', () => {
          if (!map.current) return;
          
          isZoomingRef.current = false;
          setCurrentZoom(17);
          
          // Ensure quests layer is set up
          setupQuestsLayer();
          
          // Highlight the quest by temporarily increasing its radius
          if (map.current.getLayer('quests-circles')) {
            map.current.setPaintProperty('quests-circles', 'circle-radius', [
              'case',
              ['==', ['get', 'id'], quest.id],
              20, // Highlighted quest
              [
                'interpolate',
                ['linear'],
                ['zoom'],
                2, 4,
                5, 8,
                10, 12,
                14, 16,
              ],
            ]);
            
            setTimeout(() => {
              if (map.current && map.current.getLayer('quests-circles')) {
                map.current.setPaintProperty('quests-circles', 'circle-radius', [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2, 4,
                  5, 8,
                  10, 12,
                  14, 16,
                ]);
              }
            }, 1000);
          }

          previousQuestRef.current = quest;
          
          // Show accept modal after zoom completes
          setSelectedQuest(quest);
          setShowAcceptModal(true);
          
          if (onZoomComplete) {
            onZoomComplete();
          }
        });
      });
    } else {
      // If already at globe view, just zoom in
      map.current.flyTo({
        center: [quest.longitude, quest.latitude],
        zoom: 17,
        pitch: 0,
        bearing: 0,
        duration: 2000,
        essential: true,
        easing: (t: number) => {
          // EaseInOutCubic
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        },
      });

      map.current.once('moveend', () => {
        if (!map.current) return;
        
        isZoomingRef.current = false;
        setCurrentZoom(17);
        
        setupQuestsLayer();
        
        // Highlight the quest by temporarily increasing its radius
        if (map.current.getLayer('quests-circles')) {
          map.current.setPaintProperty('quests-circles', 'circle-radius', [
            'case',
            ['==', ['get', 'id'], quest.id],
            20, // Highlighted quest
            [
              'interpolate',
              ['linear'],
              ['zoom'],
              2, 4,
              5, 8,
              10, 12,
              14, 16,
            ],
          ]);
          
          setTimeout(() => {
            if (map.current && map.current.getLayer('quests-circles')) {
              map.current.setPaintProperty('quests-circles', 'circle-radius', [
                'interpolate',
                ['linear'],
                ['zoom'],
                2, 4,
                5, 8,
                10, 12,
                14, 16,
              ]);
            }
          }, 1000);
        }

        previousQuestRef.current = quest;
        
        // Show accept modal after zoom completes
        setSelectedQuest(quest);
        setShowAcceptModal(true);
        
        if (onZoomComplete) {
          onZoomComplete();
        }
      });
    }
  }, [questToZoom, mapLoaded, onZoomComplete, setupQuestsLayer]);

  useEffect(() => {
    if (!map.current || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    } else {
      const el = document.createElement('div');
      el.style.width = '20px';
      el.style.height = '20px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#3b82f6';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';

      userMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
    }
  }, [userLocation]);

  const getDifficultyLabel = (difficulty: number): string => {
    const labels: Record<number, string> = {
      1: 'Easy',
      2: 'Medium',
      3: 'Hard',
      4: 'Very Hard',
      5: 'Expert',
    };
    return labels[difficulty] || 'Unknown';
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="relative w-full flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <p className="text-white/60 mb-2">Mapbox token is missing</p>
          <p className="text-white/40 text-sm">Please set VITE_MAPBOX_TOKEN in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height, minHeight: height }}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ borderRadius: '0.75rem' }} />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-0">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
        </div>
      )}

      {selectedQuest && showAcceptModal && (
        <div className="absolute top-4 left-4 max-w-sm z-10">
          <div className="backdrop-blur-xl bg-black/80 border border-white/10 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1">
                  {selectedQuest.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedQuest.location}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedQuest(null);
                  setShowAcceptModal(false);
                }}
                className="ml-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-white/80 mb-3 line-clamp-2">
              {selectedQuest.description}
            </p>

            <div className="flex items-center gap-3 mb-3">
              <div
                className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: `${DIFFICULTY_COLORS[selectedQuest.difficulty]}20`,
                  color: DIFFICULTY_COLORS[selectedQuest.difficulty],
                  border: `1px solid ${DIFFICULTY_COLORS[selectedQuest.difficulty]}40`,
                }}
              >
                {getDifficultyLabel(selectedQuest.difficulty)}
              </div>

              {selectedQuest.quest_type === 'sponsored' && (
                <div className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                  Sponsored
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-white/80">
                  {selectedQuest.reward_tokens} TPX
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-blue-400" />
                <span className="text-white/80">
                  {selectedQuest.reward_xp} XP
                </span>
              </div>
            </div>

            {/* Accept Quest Button */}
            <button
              onClick={async () => {
                if (!user || !selectedQuest) {
                  alert('Please connect your wallet or sign in to accept quests');
                  return;
                }

                setAccepting(true);
                try {
                  await startQuestService(user.id, selectedQuest.id);
                  if (onAcceptQuest) {
                    onAcceptQuest(selectedQuest);
                  }
                  alert('Quest accepted! You can now find it in "My Quests" section.');
                  setSelectedQuest(null);
                  setShowAcceptModal(false);
                } catch (error: any) {
                  console.error('Error accepting quest:', error);
                  alert(error.message || 'Failed to accept quest');
                } finally {
                  setAccepting(false);
                }
              }}
              disabled={accepting || !user}
              className="w-full py-2.5 px-4 rounded-lg font-semibold text-white backdrop-blur-xl bg-white/10 border border-white/30 hover:bg-white/15 hover:border-white/40 transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Accepting...</span>
                </>
              ) : user ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Quest</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sign In to Accept</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10">
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-xl p-3">
          <div className="text-xs text-white/60 mb-2">Quest Difficulty</div>
          <div className="space-y-1">
            {Object.entries(DIFFICULTY_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-white/80">
                  Level {level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-10">
        <div className="backdrop-blur-xl bg-black/60 border border-white/10 rounded-xl px-3 py-2">
          <div className="text-sm font-medium text-white">
            {quests.length} {quests.length === 1 ? 'Quest' : 'Quests'}
          </div>
        </div>
      </div>
    </div>
  );
};

