import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, MapPin, Calendar, DollarSign, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllTrips } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminTrips: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [filters, setFilters] = useState({
    userId: '',
    country: '',
    status: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadTrips();
  }, [adminUser, page, filters]);

  const loadTrips = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminTrips] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminTrips] Loading trips with wallet:', adminUser.wallet_address);
      const response = await getAllTrips({
        userId: filters.userId || undefined,
        limit,
        offset: (page - 1) * limit,
      }, adminUser.wallet_address);
      
      console.log('[AdminTrips] Response:', response);
      
      if (response && response.trips) {
        // Filter by country/status if provided
        let filtered = response.trips;
        if (filters.country) {
          filtered = filtered.filter((trip: any) => 
            trip.country?.toLowerCase().includes(filters.country.toLowerCase())
          );
        }
        if (filters.status) {
          filtered = filtered.filter((trip: any) => 
            trip.status?.toLowerCase() === filters.status.toLowerCase()
          );
        }
        setTrips(filtered);
        setTotal(response.total || 0);
      } else {
        console.warn('[AdminTrips] Unexpected response format:', response);
        setTrips([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading trips:', error);
      alert(`Failed to load trips: ${error.message || 'Unknown error'}`);
      setTrips([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Trips Management</h2>
        <p className="text-gray-400">All user trips with detailed information</p>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="User ID"
            value={filters.userId}
            onChange={(e) => {
              setFilters({ ...filters, userId: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="text"
            placeholder="Country"
            value={filters.country}
            onChange={(e) => {
              setFilters({ ...filters, country: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden p-4">
            <ScrollableTable minWidth="1000px">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Destination</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Dates</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Cost</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Quests</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                        No trips found
                      </td>
                    </tr>
                  ) : (
                    trips.map((trip) => (
                      <motion.tr
                        key={trip.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium">{trip.users?.username || trip.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {trip.users?.wallet_address?.substring(0, 10) || 'N/A'}...
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{trip.destination || trip.title || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {trip.city && trip.country ? (
                            <div>
                              <p>{trip.city}</p>
                              <p className="text-xs text-gray-400">{trip.country}</p>
                            </div>
                          ) : trip.country ? (
                            <p>{trip.country}</p>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {trip.duration_days || trip.days ? (
                            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{trip.duration_days || trip.days} days</span>
            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {trip.start_date && trip.end_date ? (
                            <div>
                              <p>{new Date(trip.start_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">to {new Date(trip.end_date).toLocaleDateString()}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {trip.total_cost ? (
                            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span>${trip.total_cost.toLocaleString()}</span>
            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {trip.quests_count !== undefined ? (
                            <div className="flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>{trip.quests_count}</span>
            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            trip.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            trip.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            trip.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {trip.status || 'draft'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(trip.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedTrip(trip)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollableTable>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} trips
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Trip Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Trip Details</h3>
                <button
                  onClick={() => setSelectedTrip(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Destination</p>
                    <p className="font-medium">{selectedTrip.destination || selectedTrip.title || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User</p>
                    <p>{selectedTrip.users?.username || selectedTrip.users?.wallet_address || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Country</p>
                    <p>{selectedTrip.country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">City</p>
                    <p>{selectedTrip.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Duration</p>
                    <p>{selectedTrip.duration_days || selectedTrip.days || 'N/A'} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Cost</p>
                    <p>${selectedTrip.total_cost ? selectedTrip.total_cost.toLocaleString() : '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Quests Count</p>
                    <p>{selectedTrip.quests_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedTrip.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      selectedTrip.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedTrip.status || 'draft'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Start Date</p>
                    <p>{selectedTrip.start_date ? new Date(selectedTrip.start_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">End Date</p>
                    <p>{selectedTrip.end_date ? new Date(selectedTrip.end_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Plan Data */}
                {selectedTrip.plan_data && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Plan Data</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedTrip.plan_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Route Data */}
                {selectedTrip.route_data && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Route Data</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedTrip.route_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Coordinates */}
                {(selectedTrip.latitude || selectedTrip.longitude) && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Coordinates</p>
                    <p className="font-mono text-sm">
                      {selectedTrip.latitude}, {selectedTrip.longitude}
                    </p>
                  </div>
                )}

                {/* Created At */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created At</p>
                  <p>{new Date(selectedTrip.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
