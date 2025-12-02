import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { glassEffects } from '../../../styles/glassEffects';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { PlacesAutocomplete } from '../../PlacesAutocomplete';
import { AuthModal } from '../../AuthModal';
import { getPlacesSuggestionsSimple } from '../../../services/placesService';
import {
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Heart,
  Loader2,
  ArrowRight,
  Coffee,
  Landmark,
  Trees,
  Music,
  AlertCircle
} from 'lucide-react';
import { Eye, EyeOff, MapIcon, Star, Clock, DollarSign as Money, X, ExternalLink, Hotel as HotelIcon, Save, Lock } from 'lucide-react';

interface CreateTripProps {
  onTripGenerated: (tripData: any) => void;
  onNavigate: (page: string) => void;
}

const interestOptions = [
  { id: 'food', label: 'Food & Coffee', icon: Coffee, color: 'from-orange-400 to-red-500' },
  { id: 'culture', label: 'Culture & History', icon: Landmark, color: 'from-purple-400 to-pink-500' },
  { id: 'nature', label: 'Nature & Parks', icon: Trees, color: 'from-green-400 to-emerald-500' },
  { id: 'nightlife', label: 'Nightlife & Fun', icon: Music, color: 'from-blue-400 to-cyan-500' },
];

export const CreateTrip: React.FC<CreateTripProps> = ({ onTripGenerated, onNavigate }) => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(3);
  const [budget, setBudget] = useState<'low' | 'medium' | 'high'>('medium');
  const [interests, setInterests] = useState<string[]>(['food', 'culture']);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [generatedTrip, setGeneratedTrip] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleGenerate = async () => {
    console.log('CreateTrip: handleGenerate called', { destination, interests, user: !!user });

    if (!destination.trim()) {
      setError('Please enter a destination');
      return;
    }

    if (interests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Import services dynamically to avoid circular dependencies
      const { generateTripPlan } = await import('../../../services/aiTripService');
      const { saveTripToSupabase } = await import('../../../services/tripService');

      // Generate trip with AI
      console.log('Generating trip plan with AI...');
      const tripPlan = await generateTripPlan({
        destination,
        days: duration,
        budget,
        interests,
      });

      console.log('Trip plan generated:', tripPlan);
      setGeneratedTrip(tripPlan);
      setSavedTripId(null); // Reset saved state

      // Show detailed view
      setShowDetailedView(true);

      // Geocode destination for map
      const coords = tripPlan.daily_plan?.[0]?.attractions?.[0]?.coordinates;
      if (coords) {
        setDestinationCoords({ lat: coords.lat, lng: coords.lng });
        setShowMap(true);
      }

      // Call onTripGenerated callback if provided
      if (onTripGenerated) {
        onTripGenerated(tripPlan);
      }
    } catch (err: any) {
      console.error('CreateTrip: Error generating trip:', err);
      setError(err.message || 'Failed to generate trip. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!generatedTrip) return;

    if (!user || !user.id) {
      setError('Please log in to save your trip');
      setShowAuthModal(true);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log('🎬 handleSaveTrip STARTED');
      console.log('📦 generatedTrip:', generatedTrip);
      console.log('📦 generatedTrip.daily_plan:', generatedTrip?.daily_plan);
      
      const { saveTripToSupabase } = await import('../../../services/tripService');

      const destCoords = generatedTrip.destination_info?.coordinates || {
        lat: generatedTrip.daily_plan?.[0]?.attractions?.[0]?.coordinates?.lat || 0,
        lng: generatedTrip.daily_plan?.[0]?.attractions?.[0]?.coordinates?.lng || 0,
      };

      console.log('📍 Destination coords:', destCoords);
      console.log('🎯 About to call saveTripToSupabase with:');
      console.log('  - userId:', user.id);
      console.log('  - destination:', destination);
      console.log('  - daily_plan length:', generatedTrip?.daily_plan?.length);

      const result = await saveTripToSupabase(
        user.id,
        {
          destination,
          duration,
          interests,
          budget,
          quests: [],
        },
        destCoords,
        {
          hotels: generatedTrip.hotels || [],
          daily_plan: generatedTrip.daily_plan || [],
          total_estimated_cost: generatedTrip.trip_overview?.total_estimated_cost || { min: 0, max: 0, total: 0 },
          generated_quests: generatedTrip.generated_quests || [],
          destination_info: generatedTrip.destination_info || {},
          metadata: generatedTrip.metadata || {},
        }
      );

      setSavedTripId(result.tripId);
      console.log('Trip saved successfully!', result);

      // Navigate to My Trips after successful save
      setTimeout(() => {
        onNavigate('trips');
      }, 1500);
    } catch (err: any) {
      console.error('Error saving trip:', err);
      setError(err.message || 'Failed to save trip');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 relative"
      >
        {/* Premium glow effect */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 rounded-3xl blur-2xl pointer-events-none"
        />
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 backdrop-blur-xl bg-gradient-to-br from-teal-400/80 to-cyan-500/80 rounded-xl flex items-center justify-center shadow-[0_8px_24px_rgba(20,184,166,0.3)] border border-white/[0.15]"
          >
            <Sparkles className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Create Your Trip</h1>
            <p className="text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>AI will generate personalized quests for your journey</p>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </motion.div>
      )}

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.01, transition: { duration: 0.3 } }}
          className="relative rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-8 shadow-2xl"
          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(15, 23, 42, 0.3)' }}
        >
          {/* Subtle glow animation */}
          <motion.div
            animate={{
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-px bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 rounded-2xl blur-xl pointer-events-none"
          />
          <div className="space-y-6">
            <div>
              <PlacesAutocomplete
                label="Where do you want to go?"
                value={destination}
                onChange={setDestination}
                getSuggestions={getPlacesSuggestionsSimple}
                placeholder="Enter destination (e.g., Paris, Tokyo, New York)"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Calendar className="w-4 h-4 text-teal-400" />
                Trip Duration: {duration} {duration === 1 ? 'day' : 'days'}
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-xs text-white/60 mt-2">
                <span>1 day</span>
                <span>7 days</span>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <DollarSign className="w-4 h-4 text-teal-400" />
                Budget Level
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['low', 'medium', 'high'].map((level) => (
                  <motion.button
                    key={level}
                    onClick={() => setBudget(level as any)}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative overflow-hidden py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                      budget === level
                        ? 'backdrop-blur-xl bg-gradient-to-r from-teal-500/90 to-cyan-500/90 border border-white/[0.15] text-white shadow-[0_8px_24px_rgba(20,184,166,0.3)]'
                        : 'backdrop-blur-xl bg-white/[0.05] border border-white/[0.08] text-white/70 hover:bg-white/[0.10] hover:text-white hover:border-white/[0.15]'
                    }`}
                  >
                    {budget === level && (
                      <motion.div
                        animate={{
                          opacity: [0.1, 0.3, 0.1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-white/[0.05] via-white/[0.15] to-white/[0.05] rounded-xl blur-xl pointer-events-none"
                      />
                    )}
                    <span className="relative">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                <Heart className="w-4 h-4 text-teal-400" />
                Your Interests
              </label>
              <div className="grid grid-cols-2 gap-3">
                {interestOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = interests.includes(option.id);

                  return (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleInterest(option.id)}
                      className={`relative overflow-hidden p-4 rounded-xl backdrop-blur-xl transition-all duration-300 ${
                        isSelected
                          ? 'bg-white/[0.08] border-2 border-teal-500/50 shadow-[0_8px_24px_rgba(20,184,166,0.3)]'
                          : 'bg-white/[0.03] border-2 border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.05] hover:shadow-lg'
                      }`}
                    >
                      {/* Premium glow on hover */}
                      {isSelected && (
                        <motion.div
                          animate={{
                            opacity: [0.3, 0.6, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className="absolute inset-0 bg-gradient-to-r from-teal-500/20 via-cyan-500/20 to-teal-500/20 rounded-xl blur-xl pointer-events-none"
                        />
                      )}
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          className={`w-10 h-10 backdrop-blur-lg bg-gradient-to-br ${option.color} rounded-lg flex items-center justify-center border border-white/[0.15] shadow-lg`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </motion.div>
                        <span className={`font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                          {option.label}
                        </span>
                      </div>
                      {isSelected && (
                        <motion.div
                          layoutId={`selected-${option.id}`}
                          className="absolute top-2 right-2 w-2 h-2 bg-teal-400 rounded-full shadow-lg shadow-teal-400/50"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            onClick={handleGenerate}
            disabled={!destination.trim() || isGenerating}
            whileHover={!isGenerating ? { scale: 1.02, y: -2 } : {}}
            whileTap={!isGenerating ? { scale: 0.98 } : {}}
            className="w-full group relative overflow-hidden py-5 rounded-xl backdrop-blur-2xl bg-gradient-to-r from-teal-500 to-cyan-500 border-2 border-white/[0.2] text-white font-bold text-lg transition-all duration-300 shadow-[0_8px_32px_rgba(20,184,166,0.5)] hover:shadow-[0_16px_64px_rgba(20,184,166,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
          >
            {/* Dark overlay for better text contrast */}
            <div className="absolute inset-0 bg-black/20 rounded-xl" />

            {/* Premium shimmer effect */}
            <motion.div
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "linear"
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-3">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI is planning your adventure...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Trip with AI
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </>
              )}
            </span>
          </motion.button>
        </motion.div>
      </div>

      {/* Generated Trip Display */}
      <AnimatePresence>
        {generatedTrip && showDetailedView && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-8 space-y-6"
          >
            {/* Close Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Your Trip to {generatedTrip.trip_overview?.city}</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDetailedView(false)}
                className="p-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Trip Overview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{generatedTrip.trip_overview?.city}</h3>
                  <p className="text-slate-300">{generatedTrip.trip_overview?.vibe || 'An amazing journey awaits'}</p>
                  {generatedTrip.trip_overview?.best_time_to_visit && (
                    <p className="text-sm text-teal-400 mt-2">Best time to visit: {generatedTrip.trip_overview.best_time_to_visit}</p>
                  )}
                  {/* Selected Interests */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {interests.map((interest) => {
                      const option = interestOptions.find(o => o.id === interest);
                      return option ? (
                        <span key={interest} className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-400">
                          {option.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-teal-400">
                    ${generatedTrip.trip_overview?.total_estimated_cost?.total || 0}
                  </div>
                  <p className="text-xs text-slate-400">Estimated total</p>
                  {/* Cost breakdown */}
                  {generatedTrip.trip_overview?.total_estimated_cost?.breakdown && (
                    <div className="mt-2 text-xs text-slate-400 space-y-1">
                      <div className="flex justify-between gap-4">
                        <span>Activities:</span>
                        <span className="text-white">${generatedTrip.trip_overview.total_estimated_cost.breakdown.activities || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Food:</span>
                        <span className="text-white">${generatedTrip.trip_overview.total_estimated_cost.breakdown.food || 0}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Transport:</span>
                        <span className="text-white">${generatedTrip.trip_overview.total_estimated_cost.breakdown.transport || 0}</span>
                      </div>
                      {generatedTrip.trip_overview.total_estimated_cost.hotel_estimate && (
                        <div className="flex justify-between gap-4 pt-1 border-t border-white/10">
                          <span>Hotels:</span>
                          <span className="text-white">${generatedTrip.trip_overview.total_estimated_cost.hotel_estimate}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Min-Max range */}
                  {generatedTrip.trip_overview?.total_estimated_cost?.min && (
                    <p className="text-xs text-slate-500 mt-1">
                      Range: ${generatedTrip.trip_overview.total_estimated_cost.min} - ${generatedTrip.trip_overview.total_estimated_cost.max}
                    </p>
                  )}
                </div>
              </div>
              {generatedTrip.trip_overview?.total_activities && (
                <div className="mt-4 flex gap-4 text-sm">
                  <span className="text-slate-300">
                    <strong className="text-white">{generatedTrip.trip_overview.total_days}</strong> days
                  </span>
                  <span className="text-slate-300">
                    <strong className="text-white">{generatedTrip.trip_overview.total_activities}</strong> activities
                  </span>
                  {generatedTrip.generated_quests && (
                    <span className="text-slate-300">
                      <strong className="text-white">{generatedTrip.generated_quests.length}</strong> quests
                    </span>
                  )}
                  {generatedTrip.hotels && (
                    <span className="text-slate-300">
                      <strong className="text-white">{generatedTrip.hotels.length}</strong> hotels
                    </span>
                  )}
                </div>
              )}
              
              {/* Budget indicator */}
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                <span className="text-sm text-slate-400">Budget Level:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  budget === 'low' ? 'bg-green-500/20 text-green-400' :
                  budget === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {budget.charAt(0).toUpperCase() + budget.slice(1)}
                </span>
              </div>
            </motion.div>

            {/* Save Trip Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex justify-center"
            >
              {savedTripId ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-500/20 border border-green-500/50 text-green-400"
                >
                  <Save className="w-5 h-5" />
                  <span className="font-medium">Trip Saved!</span>
                </motion.div>
              ) : user ? (
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveTrip}
                  disabled={isSaving}
                  className="group relative overflow-hidden px-8 py-4 rounded-xl backdrop-blur-2xl bg-gradient-to-r from-teal-500 to-cyan-500 border-2 border-white/[0.2] text-white font-bold text-lg transition-all duration-300 shadow-[0_8px_32px_rgba(20,184,166,0.5)] hover:shadow-[0_16px_64px_rgba(20,184,166,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-black/20 rounded-xl" />
                  <motion.div
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                      ease: "linear"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                  <span className="relative flex items-center justify-center gap-3">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Trip to My Trips
                      </>
                    )}
                  </span>
                </motion.button>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="px-8 py-4 rounded-xl backdrop-blur-2xl bg-slate-800/50 border-2 border-white/[0.1] text-center"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <p className="text-white font-semibold">Login Required</p>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">Connect your wallet or sign in to save trips and earn rewards</p>
                  <div className="flex gap-2 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowAuthModal(true)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium"
                    >
                      Login to Save Trip
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Hotels */}
            {generatedTrip.hotels && generatedTrip.hotels.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HotelIcon className="w-5 h-5 text-teal-400" />
                  Recommended Accommodations
                  <span className="text-sm font-normal text-slate-400">
                    ({duration} {duration === 1 ? 'night' : 'nights'})
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedTrip.hotels.slice(0, 4).map((hotel: any, idx: number) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/50 transition-colors"
                    >
                      {/* Hotel Photo */}
                      {hotel.photos && hotel.photos[0] && (
                        <img
                          src={hotel.photos[0]}
                          alt={hotel.name}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-white">{hotel.name}</h4>
                        {hotel.rating && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-white">{hotel.rating}</span>
                            {hotel.total_reviews && (
                              <span className="text-slate-400">({hotel.total_reviews})</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-2">{hotel.address}</p>
                      
                      {/* Pricing Information */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                        <div>
                          <div className="text-xs text-slate-400">Per night</div>
                          <div className="text-teal-400 font-semibold">
                            ${hotel.price_per_night_estimate || '~50'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">Total stay ({duration}n)</div>
                          <div className="text-white font-bold">
                            ${hotel.total_stay_estimate || (hotel.price_per_night_estimate ? hotel.price_per_night_estimate * duration : 50 * duration)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Price Level */}
                      {hotel.price_level && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-teal-400">
                            {'$'.repeat(hotel.price_level)}
                            <span className="text-slate-500">{'$'.repeat(4 - hotel.price_level)}</span>
                          </span>
                          <span className="text-xs text-slate-400">
                            {hotel.price_level === 1 ? 'Budget' : 
                             hotel.price_level === 2 ? 'Economy' : 
                             hotel.price_level === 3 ? 'Mid-range' : 'Luxury'}
                          </span>
                        </div>
                      )}
                      
                      {/* Contact Links */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {hotel.website && (
                          <a 
                            href={hotel.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                          >
                            Book Now
                          </a>
                        )}
                        {hotel.phone && (
                          <a 
                            href={`tel:${hotel.phone}`}
                            className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                          >
                            {hotel.phone}
                          </a>
                        )}
                      </div>
                      
                      {/* Top Review Preview */}
                      {hotel.top_review && (
                        <div className="mt-3 p-2 rounded-lg bg-white/5 text-xs">
                          <p className="text-slate-300 italic">"{hotel.top_review.text}..."</p>
                          <p className="text-slate-500 mt-1">- {hotel.top_review.author}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Daily Plan */}
            {generatedTrip.daily_plan && generatedTrip.daily_plan.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-semibold text-white">Daily Itinerary</h3>
                {generatedTrip.daily_plan.map((day: any, dayIdx: number) => (
                  <motion.div
                    key={dayIdx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + dayIdx * 0.1 }}
                    className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">Day {day.day_number}</h4>
                        {day.theme && <p className="text-sm text-teal-400">{day.theme}</p>}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">${Math.round(day.estimated_cost || 0)}</div>
                        <p className="text-xs text-slate-400">{day.total_duration || 0}h total</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {day.attractions && day.attractions.map((activity: any, actIdx: number) => (
                        <motion.div
                          key={actIdx}
                          whileHover={{ scale: 1.01, x: 4 }}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {activity.start_time && (
                                  <span className="text-xs font-medium text-teal-400">{activity.start_time}</span>
                                )}
                                <h5 className="font-medium text-white">{activity.name}</h5>
                                {activity.rating && (
                                  <div className="flex items-center gap-1 text-xs">
                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                    <span className="text-white">{activity.rating}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-slate-300 mb-2">{activity.description}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {activity.address}
                                </span>
                                {activity.duration_hours && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {activity.duration_hours}h
                                  </span>
                                )}
                                {activity.estimated_cost && activity.estimated_cost > 0 && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    ${activity.estimated_cost}
                                  </span>
                                )}
                                {activity.price_level && (
                                  <span className="flex items-center gap-1 text-teal-400">
                                    {'$'.repeat(activity.price_level)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Opening Hours */}
                              {activity.opening_hours && activity.opening_hours.length > 0 && (
                                <div className="mt-2 text-xs">
                                  <details className="cursor-pointer">
                                    <summary className="text-slate-400 hover:text-slate-300">Opening Hours</summary>
                                    <div className="mt-1 space-y-0.5 text-slate-500 pl-2">
                                      {activity.opening_hours.slice(0, 3).map((hours: string, idx: number) => (
                                        <div key={idx}>{hours}</div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              )}
                              
                              {/* Status and Contact */}
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                {activity.is_open_now !== undefined && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${activity.is_open_now ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {activity.is_open_now ? 'Open Now' : 'Closed'}
                                  </span>
                                )}
                                {activity.website && (
                                  <a 
                                    href={activity.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                  >
                                    Website
                                  </a>
                                )}
                                {activity.phone && (
                                  <a 
                                    href={`tel:${activity.phone}`}
                                    className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                                  >
                                    {activity.phone}
                                  </a>
                                )}
                              </div>
                            </div>
                            {activity.photos && activity.photos[0] && (
                              <img
                                src={activity.photos[0]}
                                alt={activity.name}
                                className="w-20 h-20 rounded-lg object-cover"
                              />
                            )}
                          </div>
                          {activity.google_maps_url && (
                            <a
                              href={activity.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors"
                            >
                              View on Google Maps
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Generated Quests */}
            {generatedTrip.generated_quests && generatedTrip.generated_quests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl bg-slate-900/30 backdrop-blur-2xl border border-slate-700/30 p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400" />
                  Generated Quests ({generatedTrip.generated_quests.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedTrip.generated_quests.map((quest: any, idx: number) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{quest.title}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm text-white">{quest.reward_xp} XP</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{quest.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Difficulty: {quest.difficulty}/10</span>
                        <span className="text-teal-400">{quest.reward_tokens} tokens</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 max-w-md mx-4">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center animate-pulse">
                    <Sparkles className="w-10 h-10 text-slate-900" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Creating Your Journey</h3>
                <p className="text-slate-400">AI is analyzing the best spots and generating personalized quests...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
