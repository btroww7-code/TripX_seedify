import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, DollarSign, Calendar, Star, CheckCircle, Circle } from 'lucide-react';
import type { GeneratedTripPlan, TripDay, TripActivity } from '../types';
import { AnimatedRouteMap } from './AnimatedRouteMap';

interface TripItineraryViewProps {
  trip: GeneratedTripPlan;
  onClose: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export const TripItineraryView: React.FC<TripItineraryViewProps> = ({
  trip,
  onClose,
  onSave,
  isSaved = false,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  const selectedDayData = trip.days.find((d) => d.day_number === selectedDay) || trip.days[0];
  
  // Collect all coordinates for map as route
  const mapRoute = trip.days.flatMap((day) =>
    day.activities
      .filter((act) => act.verified && act.coordinates.lat && act.coordinates.lng)
      .map((act) => ({
        lat: act.coordinates.lat,
        lng: act.coordinates.lng,
        name: act.place_name,
      }))
  );

  // Helper to get photo URL from photo_reference
  const getPhotoUrl = (photoRef?: string): string | undefined => {
    if (!photoRef) return undefined;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
  };

  const getTimeIcon = (time_of_day: string) => {
    switch (time_of_day) {
      case 'morning':
        return '☀️';
      case 'afternoon':
        return '🌤️';
      case 'evening':
        return '🌙';
      default:
        return '🕐';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-7xl max-h-[90vh] bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-teal-500/10 to-cyan-500/10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-3xl font-bold text-white mb-2"
              >
                {trip.trip_overview.city}, {trip.trip_overview.country}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-slate-300 text-lg"
              >
                {trip.trip_overview.vibe}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-4 mt-3 text-sm text-slate-400"
              >
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {trip.days.length} days
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {trip.trip_overview.total_estimated_cost}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.days.reduce((sum, d) => sum + d.activities.length, 0)} activities
                </span>
              </motion.div>
            </div>

            {onSave && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={onSave}
                disabled={isSaved}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  isSaved
                    ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-teal-500/50'
                }`}
              >
                {isSaved ? (
                  <>
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Saved
                  </>
                ) : (
                  'Save Trip'
                )}
              </motion.button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-180px)]">
          {/* Left: Day selector and activities */}
          <div className="w-1/2 overflow-y-auto p-6 space-y-4">
            {/* Day tabs */}
            <div className="flex gap-2 flex-wrap">
              {trip.days.map((day) => (
                <button
                  key={day.day_number}
                  onClick={() => setSelectedDay(day.day_number)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDay === day.day_number
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Day {day.day_number}
                </button>
              ))}
            </div>

            {/* Selected day details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl p-4 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-1">
                    Day {selectedDayData.day_number}
                  </h3>
                  <p className="text-teal-400 font-medium">{selectedDayData.theme}</p>
                </div>

                {/* Activities */}
                <div className="space-y-3">
                  {selectedDayData.activities.map((activity, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10 hover:border-teal-500/50 transition-all group"
                    >
                      <div className="flex gap-4">
                        {/* Photo */}
                        {getPhotoUrl(activity.photo_reference) ? (
                          <img
                            src={getPhotoUrl(activity.photo_reference)}
                            alt={activity.place_name}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-teal-400" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-white font-semibold text-lg line-clamp-1">
                              {activity.place_name}
                            </h4>
                            {activity.verified ? (
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                            ) : (
                              <Circle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                            {activity.description}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-white/10 rounded-md text-slate-300">
                              {getTimeIcon(activity.time_of_day)} {activity.time_of_day}
                            </span>
                            <span className="px-2 py-1 bg-white/10 rounded-md text-slate-300">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {activity.duration_hours}h
                            </span>
                            {activity.estimated_cost && (
                              <span className="px-2 py-1 bg-white/10 rounded-md text-slate-300">
                                <DollarSign className="w-3 h-3 inline mr-1" />
                                ${activity.estimated_cost}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Map */}
          <div className="w-1/2 border-l border-white/10">
            {mapRoute.length > 0 && (
              <AnimatedRouteMap
                route={mapRoute}
                height="100%"
                showAnimation={true}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
