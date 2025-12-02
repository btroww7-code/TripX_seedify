import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Hotel as HotelIcon, Camera, ExternalLink, Clock, DollarSign, Star, Loader2, Save, Navigation } from 'lucide-react';
import { TripMap } from './TripMap';
import { GeneratedTripPlan, Hotel, Attraction, TripDay } from '../types';

// Compatible interface for the legacy prop usage, but we prefer GeneratedTripPlan structure
interface DetailedTripViewProps {
  trip: any; // Using any to support both legacy and new structures during migration
  onClose?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  isLoggedIn?: boolean;
  onNavigate?: (page: string, params?: any) => void;
}

export const DetailedTripView: React.FC<DetailedTripViewProps> = ({ 
  trip, 
  onClose, 
  onSave, 
  isSaved = false, 
  isLoggedIn = false,
  onNavigate 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'attractions' | 'hotels' | 'map'>('overview');

  // Normalize data
  const hotels: Hotel[] = trip.hotels || [];
  const dailyPlan: TripDay[] = trip.daily_plan || trip.days || [];
  
  // Derive attractions from daily plan if not explicitly provided
  const attractions: Attraction[] = trip.attractions || dailyPlan.flatMap(day => 
    (day.activities || []).map((act: any) => ({
      name: act.place_name || act.name,
      location: act.place_name || act.name,
      coordinates: act.coordinates || { lat: act.lat || 0, lng: act.lng || 0 },
      price: act.estimated_cost || 0,
      rating: 4.5,
      description: act.description,
      photo_url: act.photo_reference,
      type: 'attraction'
    }))
  );

  const routePoints = (trip.quests || []).map((q: any) => ({
    lat: q.lat,
    lng: q.lng,
    name: q.title,
  }));

  const handleNavigateToTransit = (to: { lat: number; lng: number; name: string }) => {
    if (onNavigate) {
      onNavigate('transit', {
        to: to.name,
        toCoords: { lat: to.lat, lng: to.lng }
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6 shadow-2xl"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(15, 23, 42, 0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {trip.destination}
            </h2>
            <p className="text-slate-300" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
              {trip.duration} dni • {trip.quests?.length || 0} questów • Budget: {trip.budget}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onSave && !isSaved && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSave}
                className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 backdrop-blur-xl bg-gradient-to-r from-teal-500/90 to-cyan-500/90 border border-teal-400/30 shadow-lg shadow-teal-500/50 hover:shadow-teal-500/60 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoggedIn ? 'Save Trip' : 'Sign In to Save'}
              </motion.button>
            )}
            {isSaved && (
              <div className="px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium flex items-center gap-2">
                <Save className="w-4 h-4" />
                Saved
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-white transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700/50">
          {[
            { id: 'overview', label: 'Przegląd', icon: MapPin },
            { id: 'attractions', label: 'Atrakcje', icon: Camera },
            { id: 'hotels', label: 'Noclegi', icon: HotelIcon },
            { id: 'map', label: 'Mapa', icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-800/50 text-white border-b-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {dailyPlan.map((day, idx) => (
              <div key={idx} className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700/50 pb-2">
                  Dzień {day.day_number || idx + 1}: {day.theme || 'Zwiedzanie'}
                </h3>
                <div className="space-y-4">
                  {(day.activities || []).map((act: any, actIdx: number) => (
                    <div key={actIdx} className="flex gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
                      <div className="flex-shrink-0 w-16 text-center">
                        <span className="block text-teal-400 font-bold">{act.time || act.time_of_day}</span>
                        <span className="text-xs text-slate-500">{act.duration || act.duration_hours + 'h'}</span>
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-white text-lg">{act.activity || act.place_name}</h4>
                        <p className="text-slate-300 text-sm mb-2">{act.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {act.cost > 0 && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <DollarSign className="w-3 h-3" /> {act.cost}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {act.location || act.place_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex flex-col gap-2">
                        <button
                          onClick={() => handleNavigateToTransit({ 
                            lat: act.coordinates?.lat || 0, 
                            lng: act.coordinates?.lng || 0, 
                            name: act.activity || act.place_name 
                          })}
                          className="p-2 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
                          title="Znajdź dojazd"
                        >
                          <Navigation className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'attractions' && (
          <motion.div
            key="attractions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {attractions.map((poi, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/40 overflow-hidden hover:border-slate-600/50 transition-all flex flex-col"
              >
                {poi.photo_url && (
                  <img src={poi.photo_url} alt={poi.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4 flex-grow">
                  <h4 className="font-semibold text-white mb-1 text-lg">{poi.name}</h4>
                  <p className="text-xs text-slate-400 mb-2">{poi.location}</p>
                  <p className="text-sm text-slate-300 mb-4 line-clamp-3">{poi.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-auto">
                    {poi.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {poi.rating}
                      </span>
                    )}
                    {poi.price > 0 && (
                      <span className="flex items-center gap-1 text-teal-400">
                        <DollarSign className="w-3 h-3" /> {poi.price}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => handleNavigateToTransit({ 
                      lat: poi.coordinates.lat, 
                      lng: poi.coordinates.lng, 
                      name: poi.name 
                    })}
                    className="flex-1 py-2 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Navigation className="w-4 h-4" /> Dojazd
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(poi.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700/70 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" /> Maps
                  </a>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'hotels' && (
          <motion.div
            key="hotels"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {hotels.map((hotel, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-slate-800/40 backdrop-blur-xl border border-slate-700/40 overflow-hidden hover:border-slate-600/50 transition-all flex flex-col"
              >
                {hotel.photo_url && (
                  <img src={hotel.photo_url} alt={hotel.name} className="w-full h-48 object-cover" />
                )}
                <div className="p-4 flex-grow">
                  <h4 className="font-semibold text-white mb-1 text-lg">{hotel.name}</h4>
                  <p className="text-xs text-slate-400 mb-2">{hotel.location}</p>
                  <p className="text-sm text-slate-300 mb-4 line-clamp-3">{hotel.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    {hotel.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {hotel.rating}
                      </span>
                    )}
                    <span className="text-teal-400 font-bold">{hotel.price_per_night} PLN/noc</span>
                  </div>
                </div>
                <div className="p-4 pt-0 flex gap-2">
                  <button
                    onClick={() => handleNavigateToTransit({ 
                      lat: hotel.coordinates.lat, 
                      lng: hotel.coordinates.lng, 
                      name: hotel.name 
                    })}
                    className="flex-1 py-2 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Navigation className="w-4 h-4" /> Dojazd
                  </button>
                  {hotel.booking_url && (
                    <a
                      href={hotel.booking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" /> Rezerwuj
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TripMap
              route={routePoints}
              hotels={hotels}
              attractions={attractions}
              height="600px"
              onNavigateToTransit={handleNavigateToTransit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

