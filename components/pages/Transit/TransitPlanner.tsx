import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Navigation, Loader2, Train, ArrowRight, Calendar, Bus, Footprints, Info, DollarSign, ExternalLink, Map as MapIcon, X, Bookmark, Zap } from 'lucide-react';
import { PlacesAutocomplete } from '../../PlacesAutocomplete';
import { getPlacesSuggestionsSimple } from '../../../services/placesService';
import { searchTransitRoutes, TransitRoute, TransitLeg } from '../../../services/transitService';
import { InlineTransitMap } from '../../InlineTransitMap';
import { supabase } from '../../../lib/supabase';
import { getTicketLinkForLeg, getOperatorName } from '../../../services/ticketLinkService';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';

const getTransitIcon = (mode: string, vehicleType?: string) => {
  if (mode === 'WALKING') return Footprints;

  const type = vehicleType?.toUpperCase() || 'BUS';
  switch (type) {
    case 'BUS':
      return Bus;
    case 'TRAIN':
    case 'RAIL':
    case 'HEAVY_RAIL':
      return Train;
    case 'TRAM':
      return Train;
    default:
      return Bus;
  }
};

const getVehicleColor = (mode: string, vehicleType?: string) => {
  if (mode === 'WALKING') {
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }

  const type = vehicleType?.toUpperCase() || 'BUS';
  switch (type) {
    case 'BUS':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'TRAIN':
    case 'RAIL':
    case 'HEAVY_RAIL':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'TRAM':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
};

// Helper to calculate number of transfers (transit segments - 1)
const getTransferCount = (route: TransitRoute): number => {
  const transitLegs = route.legs?.filter(leg => leg.mode === 'TRANSIT').length || 0;
  return Math.max(0, transitLegs - 1);
};

// Helper to parse duration to minutes for sorting
const parseDurationToMinutes = (duration: string): number => {
  const hours = duration.match(/(\d+)\s*h/i);
  const minutes = duration.match(/(\d+)\s*min/i);
  return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0);
};

// Helper to parse distance to km for cost estimation
const parseDistanceToKm = (distance: string): number => {
  const km = distance.match(/([\d.]+)\s*km/i);
  const m = distance.match(/([\d.]+)\s*m(?!i)/i);
  if (km) return parseFloat(km[1]);
  if (m) return parseFloat(m[1]) / 1000;
  return 0;
};

// Estimate ticket cost based on transport type and distance (in PLN)
const estimateRouteCost = (route: TransitRoute): number => {
  const transitLegs = route.legs?.filter(leg => leg.mode === 'TRANSIT') || [];
  let totalCost = 0;
  
  for (const leg of transitLegs) {
    const vehicleType = leg.transitDetails?.line?.vehicle?.type?.toUpperCase() || 'BUS';
    const distance = parseDistanceToKm(leg.distance || '0');
    const operator = leg.transitDetails?.line?.agencies?.[0]?.name?.toLowerCase() || '';
    
    // Warsaw ZTM (single ticket ~4.4 PLN, 75min ~7 PLN)
    if (operator.includes('ztm') || operator.includes('metro')) {
      totalCost += 4.4;
    }
    // Train - PKP Intercity (base ~10-15 PLN + distance)
    else if (vehicleType.includes('TRAIN') || vehicleType.includes('RAIL') || vehicleType.includes('HEAVY')) {
      totalCost += 10 + (distance * 0.15); // ~0.15 PLN/km
    }
    // Regional trains
    else if (operator.includes('koleje') || operator.includes('km')) {
      totalCost += 5 + (distance * 0.10);
    }
    // Bus/Tram in cities
    else if (vehicleType === 'BUS' || vehicleType === 'TRAM') {
      totalCost += 4.0;
    }
    // Default estimate
    else {
      totalCost += 5.0;
    }
  }
  
  return Math.round(totalCost);
};

// Generate descriptive route summary
const generateRouteSummary = (route: TransitRoute): string => {
  const transitLegs = route.legs?.filter(leg => leg.mode === 'TRANSIT') || [];
  
  if (transitLegs.length === 0) {
    return 'Walking route';
  }
  
  // Get unique transport types with line numbers
  const segments = transitLegs.map(leg => {
    const vehicleType = leg.transitDetails?.line?.vehicle?.type?.toUpperCase() || 'BUS';
    const lineName = leg.transitDetails?.line?.shortName || leg.transitDetails?.line?.name || '';
    
    let icon = '🚌';
    if (vehicleType.includes('SUBWAY') || vehicleType.includes('METRO')) icon = '🚇';
    else if (vehicleType.includes('TRAIN') || vehicleType.includes('RAIL')) icon = '🚆';
    else if (vehicleType.includes('TRAM')) icon = '🚊';
    
    return lineName ? `${icon}${lineName}` : icon;
  });
  
  return segments.join(' → ');
};

interface TransitPlannerProps {
  transitParams?: {
    to?: string;
    toCoords?: { lat: number; lng: number };
  };
}

export const TransitPlanner: React.FC<TransitPlannerProps> = ({ transitParams }) => {
  // Check for URL parameters (from quest details)
  const urlParams = new URLSearchParams(window.location.search);
  const urlTo = urlParams.get('to') || '';
  const urlLat = urlParams.get('lat');
  const urlLng = urlParams.get('lng');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState(transitParams?.to || urlTo || '');
  const [departureTime, setDepartureTime] = useState('');
  const [routes, setRoutes] = useState<TransitRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [expandedLeg, setExpandedLeg] = useState<number | null>(null);
  const [showMap, setShowMap] = useState<number | null>(null);
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  const [savingRoute, setSavingRoute] = useState<number | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          // Auto-fill "from" with current location
          if (!from) {
            setFrom(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
          }
        },
        () => {
          setUserLocation({ lat: 52.2297, lng: 21.0122 });
        }
      );
    } else {
      setUserLocation({ lat: 52.2297, lng: 21.0122 });
    }

    // Auto-search when transit params are provided
    const targetTo = transitParams?.to || urlTo;
    const targetCoords = transitParams?.toCoords || (urlLat && urlLng ? { lat: parseFloat(urlLat), lng: parseFloat(urlLng) } : null);
    
    if (targetTo && targetCoords) {
      setTo(targetTo);
      setTimeout(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              });
              setFrom(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
              setTimeout(() => {
                handleSearch();
              }, 1000);
            },
            () => {
              setUserLocation({ lat: 52.2297, lng: 21.0122 });
              setFrom('52.2297, 21.0122');
              setTimeout(() => {
                handleSearch();
              }, 1000);
            }
          );
        }
      }, 500);
    }
  }, []);

  // Auto-search when transit params are provided
  useEffect(() => {
    if (transitParams?.to && transitParams?.toCoords && userLocation) {
      // Set "to" field
      setTo(transitParams.to);
      
      // Auto-fill "from" and search after a short delay
      setTimeout(() => {
        if (userLocation) {
          setFrom(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
          setTimeout(() => {
            handleSearch();
          }, 500);
        }
      }, 1000);
    } else if (urlTo && urlLat && urlLng && userLocation) {
      setTo(urlTo);
      setTimeout(() => {
        if (userLocation) {
          setFrom(`${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
          setTimeout(() => {
            handleSearch();
          }, 500);
        }
      }, 1000);
    }
  }, [transitParams, userLocation]);

  const handleSearch = async () => {
    if (!from || !to) {
      setError('Please fill in both "From" and "To" fields');
      return;
    }

    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedRoute(null);
    setExpandedLeg(null);

    try {
      const depTime = departureTime ? new Date(departureTime) : undefined;
      const foundRoutes = await searchTransitRoutes(from, to, depTime);

      if (foundRoutes.length === 0) {
        setError('No routes found. Try different locations or check your input.');
      } else {
        // Sort routes: fastest first, then by cost
        const sortedRoutes = [...foundRoutes].sort((a, b) => {
          const durationA = parseDurationToMinutes(a.totalDuration);
          const durationB = parseDurationToMinutes(b.totalDuration);
          const costA = estimateRouteCost(a);
          const costB = estimateRouteCost(b);
          
          // Primary sort by duration (fastest first)
          if (durationA !== durationB) {
            return durationA - durationB;
          }
          // Secondary sort by cost (cheapest first)
          return costA - costB;
        });
        setRoutes(sortedRoutes);
        console.log(`Found ${sortedRoutes.length} routes (sorted by fastest then cheapest)`);
      }
    } catch (err: any) {
      console.error('Transit search error:', err);
      setError(err.message || 'Failed to search routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (query: string): Promise<string[]> => {
    try {
      return await getPlacesSuggestionsSimple(query, userLocation);
    } catch (error) {
      console.error('Error getting place suggestions:', error);
      return [];
    }
  };

  const toggleRouteDetails = (index: number) => {
    setSelectedRoute(selectedRoute === index ? null : index);
    setExpandedLeg(null);
  };

  const toggleMap = (index: number) => {
    setShowMap(showMap === index ? null : index);
  };

  const saveRoute = async (route: TransitRoute, index: number) => {
    if (!user) {
      alert('Please log in to save routes');
      return;
    }

    setSavingRoute(index);
    try {
      const { error } = await supabase.from('saved_routes').insert({
        user_id: user.id,
        from_location: from,
        to_location: to,
        route_data: route,
        departure_time: route.departureTime,
        arrival_time: route.arrivalTime,
        total_duration: route.totalDuration,
        total_distance: route.totalDistance,
      });

      if (error) throw error;
      alert('Route saved successfully!');
    } catch (error: any) {
      console.error('Error saving route:', error);
      alert('Failed to save route: ' + error.message);
    } finally {
      setSavingRoute(null);
    }
  };

  const getRouteType = (route: TransitRoute, index: number, sortedRoutes: TransitRoute[]): { type: string; color: string; icon: any; badges: { label: string; color: string }[] } => {
    const badges: { label: string; color: string }[] = [];
    
    // Find fastest and cheapest routes
    const fastestIdx = 0; // First route is fastest after sorting
    const costs = sortedRoutes.map(r => estimateRouteCost(r));
    const minCost = Math.min(...costs);
    const cheapestIdx = costs.indexOf(minCost);
    
    const transfers = getTransferCount(route);
    const allTransfers = sortedRoutes.map(r => getTransferCount(r));
    const minTransfers = Math.min(...allTransfers);
    
    if (index === fastestIdx) {
      badges.push({ label: '⚡ Fastest', color: 'from-green-500/30 to-emerald-500/30 border-green-400/40 text-green-300' });
    }
    
    if (index === cheapestIdx || costs[index] === minCost) {
      badges.push({ label: '💰 Cheapest', color: 'from-amber-500/30 to-yellow-500/30 border-amber-400/40 text-amber-300' });
    }
    
    if (transfers === minTransfers && transfers < 2) {
      badges.push({ label: '🔄 Fewest Transfers', color: 'from-blue-500/30 to-indigo-500/30 border-blue-400/40 text-blue-300' });
    }
    
    // Main badge color based on priority
    if (index === fastestIdx) {
      return { type: 'Fastest', color: 'from-green-500/30 to-emerald-500/30 border-green-400/40 text-green-300', icon: Zap, badges };
    }
    if (index === cheapestIdx || costs[index] === minCost) {
      return { type: 'Cheapest', color: 'from-amber-500/30 to-yellow-500/30 border-amber-400/40 text-amber-300', icon: DollarSign, badges };
    }
    return { type: 'Alternative', color: 'from-purple-500/30 to-pink-500/30 border-purple-400/40 text-purple-300', icon: Info, badges };
  };

  const getTicketLink = (route: TransitRoute): string => {
    const hasMetro = route.legs.some(leg =>
      leg.transitDetails?.line?.vehicle?.type?.toUpperCase().includes('SUBWAY') ||
      leg.transitDetails?.line?.vehicle?.type?.toUpperCase().includes('METRO')
    );
    const hasBus = route.legs.some(leg =>
      leg.transitDetails?.line?.vehicle?.type?.toUpperCase().includes('BUS')
    );
    const hasTrain = route.legs.some(leg =>
      leg.transitDetails?.line?.vehicle?.type?.toUpperCase().includes('TRAIN') ||
      leg.transitDetails?.line?.vehicle?.type?.toUpperCase().includes('RAIL')
    );

    if (from.toLowerCase().includes('warsaw') || to.toLowerCase().includes('warsaw') ||
        from.toLowerCase().includes('warszawa') || to.toLowerCase().includes('warszawa')) {
      return 'https://www.wtp.waw.pl/en/ticket-offer/';
    }
    if (hasTrain) {
      return 'https://www.intercity.pl/';
    }
    if (hasMetro || hasBus) {
      return 'https://jakdojade.pl/';
    }
    return 'https://www.google.com/search?q=buy+public+transport+ticket';
  };

  const toggleLegDetails = (index: number) => {
    setExpandedLeg(expandedLeg === index ? null : index);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 backdrop-blur-xl bg-gradient-to-br from-blue-400/80 to-indigo-500/80 rounded-xl flex items-center justify-center shadow-[0_8px_24px_rgba(79,70,229,0.3)] border border-white/[0.15]"
            >
              <Train className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Transit Planner</h1>
              <p className="text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>Find public transport connections</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <PlacesAutocomplete
              label="From"
              value={from}
              onChange={setFrom}
              getSuggestions={getSuggestions}
              placeholder="e.g., Warsaw Central Station"
            />
            <PlacesAutocomplete
              label="To"
              value={to}
              onChange={setTo}
              getSuggestions={getSuggestions}
              placeholder="e.g., Krakow Main Square"
            />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-white mb-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              Departure Date & Time (optional)
            </label>
            <div className="relative">
              <motion.input
                whileFocus={{ scale: 1.01 }}
                type="datetime-local"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full backdrop-blur-lg bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all duration-300"
              />
            </div>
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl backdrop-blur-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}
          <motion.button
            onClick={handleSearch}
            disabled={loading}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative overflow-hidden py-4 rounded-xl backdrop-blur-xl bg-gradient-to-r from-blue-500/90 to-indigo-500/90 border border-white/[0.15] text-white font-semibold shadow-[0_8px_24px_rgba(79,70,229,0.3)] hover:shadow-[0_12px_32px_rgba(79,70,229,0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Train className="w-5 h-5" />
                  Find Connections
                </>
              )}
            </span>
          </motion.button>
        </motion.div>

        {routes.length > 0 && (
          <div className="space-y-4">
            {routes.map((route, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] transition-all duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.08]">
                    <div className="flex-1">
                      {/* Route Summary with transport icons */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                          {generateRouteSummary(route)}
                        </h3>
                      </div>
                      
                      {/* Main stats row - PROMINENT */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg bg-blue-500/10 border border-blue-500/20">
                          <Clock className="w-5 h-5 text-blue-400" />
                          <div>
                            <div className="text-xs text-blue-300/70">Duration</div>
                            <div className="text-sm font-bold text-blue-300">{route.totalDuration}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg bg-purple-500/10 border border-purple-500/20">
                          <Navigation className="w-5 h-5 text-purple-400" />
                          <div>
                            <div className="text-xs text-purple-300/70">Distance</div>
                            <div className="text-sm font-bold text-purple-300">{route.totalDistance}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg bg-orange-500/10 border border-orange-500/20">
                          <ArrowRight className="w-5 h-5 text-orange-400" />
                          <div>
                            <div className="text-xs text-orange-300/70">Transfers</div>
                            <div className="text-sm font-bold text-orange-300">
                              {getTransferCount(route) === 0 ? 'Direct' : `${getTransferCount(route)} transfer${getTransferCount(route) > 1 ? 's' : ''}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg bg-green-500/10 border border-green-500/20">
                          <DollarSign className="w-5 h-5 text-green-400" />
                          <div>
                            <div className="text-xs text-green-300/70">Est. Cost</div>
                            <div className="text-sm font-bold text-green-300">~{estimateRouteCost(route)} PLN</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Departure/Arrival times */}
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Clock className="w-4 h-4 text-green-400" />
                        <span className="font-medium">{route.departureTime}</span>
                        <ArrowRight className="w-4 h-4 text-white/40" />
                        <Clock className="w-4 h-4 text-red-400" />
                        <span className="font-medium">{route.arrivalTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(() => {
                      const routeType = getRouteType(route, idx, routes);
                      return routeType.badges.map((badge, badgeIdx) => (
                        <motion.div
                          key={badgeIdx}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.1 + badgeIdx * 0.05, type: 'spring', stiffness: 200 }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          className={`px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-lg border bg-gradient-to-r ${badge.color} shadow-lg`}
                        >
                          <span>{badge.label}</span>
                        </motion.div>
                      ));
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <motion.a
                      href={getTicketLink(route)}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-lg bg-gradient-to-r from-green-500/30 to-emerald-500/30 border border-green-400/40 text-green-300 hover:from-green-500/40 hover:to-emerald-500/40 transition-all duration-300 shadow-lg"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">Buy Ticket</span>
                      <ExternalLink className="w-3 h-3" />
                    </motion.a>
                    {user && (
                      <motion.button
                        onClick={() => saveRoute(route, idx)}
                        disabled={savingRoute === idx}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-lg bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border border-yellow-400/40 text-yellow-300 hover:from-yellow-500/40 hover:to-orange-500/40 transition-all duration-300 shadow-lg disabled:opacity-50"
                      >
                        {savingRoute === idx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
                        <span className="text-sm font-medium">Save</span>
                      </motion.button>
                    )}
                    <motion.button
                      onClick={() => toggleMap(idx)}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-lg bg-gradient-to-r from-blue-500/30 to-indigo-500/30 border border-blue-400/40 text-blue-300 hover:from-blue-500/40 hover:to-indigo-500/40 transition-all duration-300 shadow-lg"
                    >
                      <MapIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{showMap === idx ? 'Hide Map' : 'View Map'}</span>
                    </motion.button>
                    <motion.button
                      onClick={() => toggleRouteDetails(idx)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg backdrop-blur-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all duration-300"
                    >
                      <span className="text-sm font-medium">{selectedRoute === idx ? 'Hide Details' : 'Show Details'}</span>
                    </motion.button>
                  </div>


                  <AnimatePresence>
                    {selectedRoute === idx && route.legs && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3 mt-4"
                      >
                        {route.legs.map((leg, legIdx) => {
                          const Icon = getTransitIcon(leg.mode, leg.transitDetails?.line?.vehicle?.type);
                          const colorClass = getVehicleColor(leg.mode, leg.transitDetails?.line?.vehicle?.type);

                          return (
                            <motion.div
                              key={legIdx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: legIdx * 0.05 }}
                              className="rounded-xl backdrop-blur-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
                            >
                              <div
                                onClick={() => leg.mode === 'TRANSIT' && toggleLegDetails(legIdx)}
                                className={`flex items-start gap-3 p-4 ${leg.mode === 'TRANSIT' ? 'cursor-pointer' : ''}`}
                              >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-white">
                                      {leg.mode === 'WALKING'
                                        ? 'Walk'
                                        : leg.transitDetails?.line?.shortName || leg.transitDetails?.line?.name || leg.mode}
                                    </h4>
                                    <span className="text-xs text-white/50">
                                      {leg.duration}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/70 mb-2">
                                    {leg.instructions}
                                  </p>
                                  {leg.transitDetails && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-lg bg-white/[0.05] text-white/60">
                                        <MapPin className="w-3 h-3" />
                                        {leg.transitDetails.departureStop?.name}
                                      </div>
                                      <ArrowRight className="w-3 h-3 text-white/40" />
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-lg bg-white/[0.05] text-white/60">
                                        <MapPin className="w-3 h-3" />
                                        {leg.transitDetails.arrivalStop?.name}
                                      </div>
                                      <div className="flex items-center gap-1 px-2 py-1 rounded-md backdrop-blur-lg bg-white/[0.05] text-white/60">
                                        <Clock className="w-3 h-3" />
                                        {leg.transitDetails.departureTime} → {leg.transitDetails.arrivalTime}
                                      </div>
                                      {leg.transitDetails.numStops > 0 && (
                                        <div className="px-2 py-1 rounded-md backdrop-blur-lg bg-white/[0.05] text-white/60">
                                          {leg.transitDetails.numStops} stops
                                        </div>
                                      )}
                                      {leg.transitDetails.headsign && (
                                        <div className="px-2 py-1 rounded-md backdrop-blur-lg bg-white/[0.05] text-white/60 italic">
                                          → {leg.transitDetails.headsign}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {leg.mode === 'TRANSIT' && (() => {
                                    const ticketLink = getTicketLinkForLeg(leg);
                                    return ticketLink ? (
                                      <motion.a
                                        href={ticketLink.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg backdrop-blur-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-300 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 text-xs font-medium"
                                      >
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>{ticketLink.displayName}</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </motion.a>
                                    ) : null;
                                  })()}
                                </div>
                              </div>

                              <AnimatePresence>
                                {expandedLeg === legIdx && leg.transitDetails && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-4 pb-4 border-t border-white/[0.05]"
                                  >
                                    <div className="mt-3 p-3 rounded-lg backdrop-blur-lg bg-white/[0.02] space-y-2">
                                      <div className="text-xs text-white/70">
                                        <span className="font-semibold text-white">Line:</span> {leg.transitDetails.line.name}
                                      </div>
                                      {leg.transitDetails.line.agencies && leg.transitDetails.line.agencies.length > 0 && (
                                        <div className="text-xs text-white/70">
                                          <span className="font-semibold text-white">Operator:</span> {leg.transitDetails.line.agencies[0].name}
                                        </div>
                                      )}
                                      <div className="text-xs text-white/70">
                                        <span className="font-semibold text-white">Vehicle:</span> {leg.transitDetails.line.vehicle.type}
                                      </div>
                                      <div className="text-xs text-white/70">
                                        <span className="font-semibold text-white">Distance:</span> {leg.distance}
                                      </div>
                                      {(() => {
                                        const ticketLink = getTicketLinkForLeg(leg);
                                        return ticketLink ? (
                                          <div className="pt-2 mt-2 border-t border-white/[0.05]">
                                            <motion.a
                                              href={ticketLink.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              whileHover={{ scale: 1.02 }}
                                              whileTap={{ scale: 0.98 }}
                                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 text-green-300 hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-300 text-xs font-medium w-full justify-center"
                                            >
                                              <DollarSign className="w-4 h-4" />
                                              <span>Buy {ticketLink.displayName} from {ticketLink.provider}</span>
                                              <ExternalLink className="w-3 h-3" />
                                            </motion.a>
                                          </div>
                                        ) : null;
                                      })()}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Map section - outside padding */}
                {showMap === idx && (
                  <div className="border-t border-white/[0.08] relative" style={{ backgroundColor: 'transparent' }}>
                    <div className="h-[500px] w-full relative">
                      <InlineTransitMap route={route} isOpen={true} />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {loading && routes.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-white">Searching for best connections...</p>
          </motion.div>
        )}
      </div>
    </>
  );
};
