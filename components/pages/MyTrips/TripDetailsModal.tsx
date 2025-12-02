import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  Calendar,
  DollarSign,
  Hotel,
  Clock,
  Star,
  Phone,
  Globe,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Map as MapIcon
} from 'lucide-react';
import { AttractionMapbox } from '../../AttractionMapbox';

interface TripDetailsModalProps {
  trip: any;
  onClose: () => void;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({ trip, onClose }) => {
  const routeData = trip.route_data || {};
  const hotels = routeData.hotels || [];
  const dailyPlan = routeData.daily_plan || [];
  const totalCost = routeData.total_estimated_cost || { min: 0, max: 0, total: 0 };
  const [expandedMaps, setExpandedMaps] = useState<{ [key: string]: boolean }>({});

  const toggleMap = (attractionId: string) => {
    setExpandedMaps(prev => ({ ...prev, [attractionId]: !prev[attractionId] }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBusinessStatusIcon = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'CLOSED_TEMPORARILY':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'CLOSED_PERMANENTLY':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getBusinessStatusText = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'Open';
      case 'CLOSED_TEMPORARILY':
        return 'Temporarily Closed';
      case 'CLOSED_PERMANENTLY':
        return 'Permanently Closed';
      default:
        return 'Unknown';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl"
          style={{
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/30 border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {trip.destination}
                </h2>
                <div className="flex items-center gap-4 text-white/60 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{trip.duration_days} days</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="capitalize">{trip.budget} budget</span>
                  </div>
                  {totalCost.total > 0 && (
                    <div className="flex items-center gap-1 text-amber-400 font-semibold">
                      <span>{formatCurrency(totalCost.total)}</span>
                    </div>
                  )}
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-xl backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
              >
                <X className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 space-y-8">
            {/* Hotels Section */}
            {hotels.length > 0 && (
              <section>
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Hotel className="w-6 h-6 text-cyan-400" />
                  Recommended Hotels
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotels.map((hotel: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="rounded-xl overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                    >
                      {hotel.photos && hotel.photos[0] && (
                        <div className="h-48 overflow-hidden">
                          <img
                            src={hotel.photos[0]}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4 space-y-2">
                        <h4 className="text-white font-semibold text-lg">{hotel.name}</h4>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-white/80">{hotel.rating?.toFixed(1) || 'N/A'}</span>
                          <span className="text-white/50 text-sm">({hotel.user_ratings_total || 0} reviews)</span>
                        </div>
                        <p className="text-white/60 text-sm line-clamp-2">{hotel.address}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-amber-400 font-semibold">{hotel.price_range || 'Price on request'}</span>
                          <span className="text-white/70">{'$'.repeat(hotel.price_level || 2)}</span>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          {getBusinessStatusIcon(hotel.business_status)}
                          <span className={`text-sm ${hotel.business_status === 'OPERATIONAL' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {getBusinessStatusText(hotel.business_status)}
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          {hotel.website && (
                            <a
                              href={hotel.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 px-3 rounded-lg backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm flex items-center justify-center gap-2 transition-all"
                            >
                              <Globe className="w-4 h-4" />
                              Website
                            </a>
                          )}
                          <a
                            href={hotel.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 rounded-lg backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-sm flex items-center justify-center gap-2 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Book
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Daily Plan Section */}
            {dailyPlan.length > 0 && (
              <section>
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-purple-400" />
                  Daily Itinerary
                </h3>
                <div className="space-y-6">
                  {dailyPlan.map((day: any, dayIdx: number) => (
                    <motion.div
                      key={dayIdx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: dayIdx * 0.1 }}
                      className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-white">Day {day.day_number}</h4>
                          <p className="text-cyan-400 text-sm">{day.theme}</p>
                        </div>
                        {day.estimated_cost > 0 && (
                          <div className="text-amber-400 font-semibold">
                            {formatCurrency(day.estimated_cost)}
                          </div>
                        )}
                      </div>

                      {/* Attractions for this day */}
                      <div className="space-y-4">
                        {day.attractions && day.attractions.map((attraction: any, attrIdx: number) => (
                          <div
                            key={attrIdx}
                            className="rounded-lg backdrop-blur-xl bg-white/5 border border-white/10 p-4"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h5 className="text-white font-semibold text-lg">{attraction.name}</h5>
                                <p className="text-white/60 text-sm mt-1">{attraction.description}</p>
                              </div>
                              <div className="flex flex-col items-end gap-1 ml-4">
                                <span className="text-cyan-400 text-sm font-medium">
                                  {attraction.start_time || attraction.time_of_day || '9:00 AM'}
                                </span>
                                <span className="text-white/50 text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {attraction.duration_hours || 2}h
                                </span>
                              </div>
                            </div>

                            {/* Photos */}
                            {attraction.photos && attraction.photos.length > 0 && (
                              <div className="flex gap-2 mb-3 overflow-x-auto">
                                {attraction.photos.slice(0, 3).map((photo: string, photoIdx: number) => (
                                  <img
                                    key={photoIdx}
                                    src={photo}
                                    alt={attraction.name}
                                    className="w-24 h-24 object-cover rounded-lg"
                                  />
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="text-white/80">{attraction.rating?.toFixed(1) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-amber-400" />
                                <span className="text-white/80">
                                  {attraction.estimated_cost ? `$${attraction.estimated_cost}` : attraction.ticket_price || 'Free'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getBusinessStatusIcon(attraction.business_status)}
                                <span className={`${attraction.business_status === 'OPERATIONAL' ? 'text-green-400' : 'text-yellow-400'} text-xs`}>
                                  {attraction.opening_hours?.open_now ? 'Open now' : 'Closed'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span className="text-white/60 text-xs">{attraction.address?.split(',')[0] || 'Location'}</span>
                              </div>
                            </div>

                            {/* Opening Hours */}
                            {attraction.opening_hours?.weekday_text && attraction.opening_hours.weekday_text.length > 0 && (
                              <details className="mt-3">
                                <summary className="text-cyan-400 text-sm cursor-pointer hover:text-cyan-300 transition-colors">
                                  View Opening Hours
                                </summary>
                                <div className="mt-2 p-3 rounded-lg bg-black/20 space-y-1">
                                  {attraction.opening_hours.weekday_text.map((hours: string, idx: number) => (
                                    <p key={idx} className="text-white/60 text-xs">{hours}</p>
                                  ))}
                                </div>
                              </details>
                            )}

                            {/* Reviews Summary */}
                            {attraction.reviews_summary && (
                              <details className="mt-3">
                                <summary className="text-cyan-400 text-sm cursor-pointer hover:text-cyan-300 transition-colors">
                                  View Reviews
                                </summary>
                                <div className="mt-2 p-3 rounded-lg bg-black/20">
                                  <p className="text-white/60 text-xs whitespace-pre-wrap">{attraction.reviews_summary}</p>
                                </div>
                              </details>
                            )}

                            {/* Map View */}
                            {attraction.coordinates && (
                              <div className="mt-4">
                                <button
                                  onClick={() => toggleMap(`${dayIdx}-${attrIdx}`)}
                                  className="w-full py-2 px-3 rounded-lg backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-sm flex items-center justify-center gap-2 transition-all mb-3"
                                >
                                  <MapIcon className="w-4 h-4" />
                                  {expandedMaps[`${dayIdx}-${attrIdx}`] ? 'Hide Map' : 'Show Map'}
                                </button>

                                {expandedMaps[`${dayIdx}-${attrIdx}`] && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="rounded-lg overflow-hidden mb-3"
                                  >
                                    <AttractionMapbox
                                      latitude={attraction.coordinates.lat}
                                      longitude={attraction.coordinates.lng}
                                      name={attraction.name}
                                      className="w-full h-64 rounded-lg"
                                    />
                                  </motion.div>
                                )}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                              {attraction.website && (
                                <a
                                  href={attraction.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-2 px-3 rounded-lg backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                  <Globe className="w-4 h-4" />
                                  Website
                                </a>
                              )}
                              {attraction.google_maps_url && (
                                <a
                                  href={attraction.google_maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-2 px-3 rounded-lg backdrop-blur-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                  <MapPin className="w-4 h-4" />
                                  Open in Maps
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* No Data Message */}
            {hotels.length === 0 && dailyPlan.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
                <p className="text-white/60 text-lg">No detailed plan data available for this trip.</p>
                <p className="text-white/40 text-sm mt-2">Try regenerating the trip to get detailed information.</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
