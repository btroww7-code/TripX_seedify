import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Calendar,
  DollarSign,
  Hotel,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
  Edit3,
  Download,
  Share2,
  CheckCircle2
} from 'lucide-react';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { getUserTrips } from '../../../services/tripService';
import { supabase } from '../../../lib/supabase';
import { glassEffects } from '../../../styles/glassEffects';
import { TripDetailsModal } from './TripDetailsModal';
import { TripEditModal } from './TripEditModal';
import { TripStatsPanel } from './TripStatsPanel';

interface MyTripsProps {
  onNavigate?: (page: string) => void;
}

export const MyTrips: React.FC<MyTripsProps> = ({ onNavigate }) => {
  const { user: walletUser, isConnected: isWalletConnected } = useWalletAuth();
  const { user: emailUser, isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const user = walletUser || emailUser;
  const isLoggedIn = isWalletConnected || isEmailAuthenticated;
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [editingTrip, setEditingTrip] = useState<any | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setTrips([]);
      setLoading(false);
      return;
    }

    if (user) {
      // User is logged in and loaded - load trips immediately
      console.log('[MyTrips] User loaded, loading trips...', user.id);
      loadTrips();
    } else {
      // User is logged in but data not loaded yet - wait and retry with multiple attempts
      console.log('[MyTrips] Waiting for user data...');
      let attempts = 0;
      const maxAttempts = 5;
      
      const checkUser = () => {
        attempts++;
        if (user) {
          console.log('[MyTrips] User loaded after wait, loading trips...', user.id);
          loadTrips();
        } else if (attempts < maxAttempts) {
          console.log(`[MyTrips] Retry ${attempts}/${maxAttempts} - waiting for user...`);
          setTimeout(checkUser, 1000);
        } else {
          console.log('[MyTrips] User still not loaded after all attempts');
          setLoading(false);
        }
      };
      
      const timer = setTimeout(checkUser, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, user]);

  const loadTrips = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const userTrips = await getUserTrips(user.id);
      setTrips(userTrips || []);
    } catch (error) {
      console.error('Error loading trips:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!user || !confirm('Are you sure you want to delete this trip? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      alert(error.message || 'Failed to delete trip. Please try again.');
    }
  };

  const handleExportTrip = (trip: any) => {
    const exportData = {
      destination: trip.destination,
      duration: trip.duration_days,
      budget: trip.budget,
      interests: trip.interests,
      created_at: trip.created_at,
      route_data: trip.route_data,
      notes: trip.notes,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-${trip.destination.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMarkComplete = async (tripId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('trips')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', tripId)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadTrips();
    } catch (error: any) {
      console.error('Error marking trip as complete:', error);
      alert(error.message || 'Failed to update trip status.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading && isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-6" style={glassEffects.inlineStyles.glass}>
            <MapPin className="w-10 h-10 text-white/60" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>Please Sign In</h2>
          <p className="text-white/60 mb-6">Connect your wallet or sign in with email to view and manage your trips</p>
          {onNavigate && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Trigger wallet connection - this will be handled by Web3Provider
                if (window.ethereum) {
                  window.ethereum.request({ method: 'eth_requestAccounts' });
                }
              }}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 backdrop-blur-xl bg-white/[0.12] border border-white/[0.20] hover:bg-white/[0.18] hover:shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
              style={{
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)'
              }}
            >
              Connect Wallet
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full backdrop-blur-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-6" style={glassEffects.inlineStyles.glass}>
            <MapPin className="w-10 h-10 text-white/60" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>No Trips Yet</h2>
          <p className="text-white/60 mb-6">Create a trip from the Create Trip page to start planning</p>
          {onNavigate && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate('create')}
              className="px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 backdrop-blur-xl bg-white/[0.12] border border-white/[0.20] hover:bg-white/[0.18] hover:shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
              style={{
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)'
              }}
            >
              Create Your First Trip
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {user && <TripStatsPanel userId={user.id} />}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>My Trips</h1>
          <p className="text-white/60" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>View and manage your travel plans</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-all duration-300 backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-[0_8px_32px_rgba(255,255,255,0.08)]"
          style={{
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          {showMap ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide Map
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show Map
            </>
          )}
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${showMap ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          {trips.map((trip, index) => {
            const routeData = trip.route_data || {};
            const hotels = routeData.hotels || [];
            const dailyPlan = routeData.daily_plan || [];
            const totalCost = routeData.total_estimated_cost || { total: 0 };

            return (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative rounded-2xl p-6 overflow-hidden transition-all duration-300"
                style={{
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                }}
              >
                <motion.div
                  animate={{
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.05, 1]
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none"
                />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-2xl font-bold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                          {trip.destination}
                        </h3>
                        {trip.status === 'completed' && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-green-400 font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-white/60 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{trip.duration_days} {trip.duration_days === 1 ? 'day' : 'days'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="capitalize">{trip.budget} budget</span>
                        </div>
                        {totalCost.total > 0 && (
                          <div className="flex items-center gap-1 text-amber-400">
                            <span className="font-semibold">{formatCurrency(totalCost.total)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setEditingTrip(trip)}
                        className="p-2 rounded-lg backdrop-blur-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/30 transition-all"
                        title="Edit trip"
                      >
                        <Edit3 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleExportTrip(trip)}
                        className="p-2 rounded-lg backdrop-blur-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition-all"
                        title="Export trip"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>
                      {trip.status !== 'completed' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleMarkComplete(trip.id)}
                          className="p-2 rounded-lg backdrop-blur-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all"
                          title="Mark as completed"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="p-2 rounded-lg backdrop-blur-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all"
                        title="Delete trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Trip Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {hotels.length > 0 && (
                      <div className="text-center p-2 rounded-lg backdrop-blur-xl bg-white/[0.05] border border-white/[0.08]">
                        <Hotel className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                        <p className="text-xs text-white/60">Hotels</p>
                        <p className="text-white font-semibold">{hotels.length}</p>
                      </div>
                    )}
                    {dailyPlan.length > 0 && (
                      <div className="text-center p-2 rounded-lg backdrop-blur-xl bg-white/[0.05] border border-white/[0.08]">
                        <Clock className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                        <p className="text-xs text-white/60">Activities</p>
                        <p className="text-white font-semibold">
                          {dailyPlan.reduce((sum: number, d: any) => sum + (d.attractions?.length || 0), 0)}
                        </p>
                      </div>
                    )}
                    {totalCost.total > 0 && (
                      <div className="text-center p-2 rounded-lg backdrop-blur-xl bg-white/[0.05] border border-white/[0.08]">
                        <DollarSign className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                        <p className="text-xs text-white/60">Budget</p>
                        <p className="text-white font-semibold text-xs">{formatCurrency(totalCost.total)}</p>
                      </div>
                    )}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTrip(trip)}
                    className="w-full mt-4 py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-xl bg-white/[0.12] border border-white/[0.20] text-white hover:bg-white/[0.18] hover:shadow-[0_8px_32px_rgba(255,255,255,0.12)]"
                    style={{
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                    }}
                  >
                    View Full Details
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {showMap && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              height: '500px',
              minHeight: '500px'
            }}
          >
            <div className="h-full flex items-center justify-center">
              <p className="text-white/60">Map view coming soon</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Trip Details Modal */}
      {selectedTrip && (
        <TripDetailsModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}

      {/* Trip Edit Modal */}
      {editingTrip && user && (
        <TripEditModal
          trip={editingTrip}
          userId={user.id}
          onClose={() => setEditingTrip(null)}
          onSave={loadTrips}
        />
      )}
    </div>
  );
};
