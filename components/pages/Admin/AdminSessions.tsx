import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllSessions } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminSessions: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [filters, setFilters] = useState({
    userId: '',
    ipAddress: '',
    deviceType: '',
    os: '',
    status: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadSessions();
  }, [adminUser, page, filters]);

  const loadSessions = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminSessions] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminSessions] Loading sessions with wallet:', adminUser.wallet_address);
      const response = await getAllSessions({
        userId: filters.userId || undefined,
        isActive: filters.status === 'active' ? true : filters.status === 'ended' ? false : undefined,
        limit,
        offset: (page - 1) * limit,
      }, adminUser.wallet_address);
      
      console.log('[AdminSessions] Response:', response);
      console.log('[AdminSessions] Sessions count:', response?.sessions?.length || 0);
      console.log('[AdminSessions] Total:', response?.total || 0);
      
      if (response && response.sessions) {
        // Filter by search if provided
        let filtered = response.sessions;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter((session: any) => 
            session.ip_address?.toLowerCase().includes(searchLower) ||
            session.fingerprint?.toLowerCase().includes(searchLower) ||
            session.users?.wallet_address?.toLowerCase().includes(searchLower) ||
            session.users?.username?.toLowerCase().includes(searchLower)
          );
        }
        if (filters.deviceType) {
          filtered = filtered.filter((session: any) => 
            session.device_type?.toLowerCase() === filters.deviceType.toLowerCase()
          );
        }
        if (filters.os) {
          filtered = filtered.filter((session: any) => 
            session.os?.toLowerCase().includes(filters.os.toLowerCase()) ||
            session.os_info?.name?.toLowerCase().includes(filters.os.toLowerCase())
          );
        }
        if (filters.ipAddress) {
          filtered = filtered.filter((session: any) => 
            session.ip_address?.includes(filters.ipAddress)
          );
        }
        console.log('[AdminSessions] Filtered sessions count:', filtered.length);
        setSessions(filtered);
        setTotal(response.total || 0);
      } else {
        console.warn('[AdminSessions] Unexpected response format:', response);
        console.warn('[AdminSessions] Response keys:', response ? Object.keys(response) : 'null');
        setSessions([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      alert(`Failed to load sessions: ${error.message || 'Unknown error'}`);
      setSessions([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['User', 'IP Address', 'Country', 'City', 'Device Type', 'OS', 'Browser', 'Fingerprint Hash', 'Status', 'Created', 'Last Activity', 'Duration'];
    const rows = sessions.map(session => [
      session.users?.username || session.users?.wallet_address || 'Unknown',
      session.ip_address || 'N/A',
      session.country || 'N/A',
      session.city || 'N/A',
      session.device_type || 'N/A',
      session.os_info?.name ? `${session.os_info.name} ${session.os_info.version}` : session.os || 'N/A',
      session.browser_info?.name ? `${session.browser_info.name} ${session.browser_info.version}` : session.browser || 'N/A',
      session.fingerprint_hash || session.fingerprint || 'N/A',
      session.is_active ? 'Active' : 'Ended',
      new Date(session.created_at).toLocaleString(),
      session.last_activity_at ? new Date(session.last_activity_at).toLocaleString() : 'N/A',
      session.session_duration_seconds ? `${Math.floor(session.session_duration_seconds / 60)}m` : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sessions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">User Sessions</h2>
          <p className="text-gray-400">All user sessions with detailed device and location info</p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by IP, fingerprint, user..."
              value={filters.search}
              onChange={(e) => {
                setFilters({ ...filters, search: e.target.value });
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
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
            placeholder="IP Address"
            value={filters.ipAddress}
            onChange={(e) => {
              setFilters({ ...filters, ipAddress: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <select
            value={filters.deviceType}
            onChange={(e) => {
              setFilters({ ...filters, deviceType: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Devices</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
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
            <ScrollableTable minWidth="1400px">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">IP Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Device</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">OS</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Browser</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fingerprint</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Created</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-gray-400">
                        No sessions found
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <motion.tr
                        key={session.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium">{session.users?.username || session.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {session.users?.wallet_address?.substring(0, 10) || 'N/A'}...
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">{session.ip_address || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                          {session.city && session.country ? (
                            <div>
                              <p>{session.city}</p>
                              <p className="text-xs text-gray-400">{session.country}</p>
                            </div>
                          ) : session.country ? (
                            <p>{session.country}</p>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <p>{session.device_type || 'Unknown'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {session.os_info && typeof session.os_info === 'object' ? (
                            <div>
                              <p>{session.os_info.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{session.os_info.version || ''} {session.os_info.architecture || ''}</p>
                            </div>
                          ) : session.os ? (
                            <p>{session.os}</p>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {session.browser_info && typeof session.browser_info === 'object' ? (
                            <div>
                              <p>{session.browser_info.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{session.browser_info.version || ''} ({session.browser_info.engine || ''})</p>
                            </div>
                          ) : session.browser ? (
                            <p>{session.browser}</p>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs text-gray-400">
                            {session.fingerprint_hash || session.fingerprint ? 
                              (session.fingerprint_hash || session.fingerprint).substring(0, 16) + '...' : 
                              'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {session.is_active ? 'Active' : 'Ended'}
                          </span>
                          {session.end_reason && (
                            <p className="text-xs text-gray-400 mt-1">{session.end_reason}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {session.session_duration_seconds ? 
                            `${Math.floor(session.session_duration_seconds / 60)}m ${session.session_duration_seconds % 60}s` : 
                            session.is_active ? 'Ongoing' : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(session.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSession(session)}
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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} sessions
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

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Session Details</h3>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User</p>
                    <p>{selectedSession.users?.username || selectedSession.users?.wallet_address || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">IP Address</p>
                    <p className="font-mono text-sm">{selectedSession.ip_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Country</p>
                    <p>{selectedSession.country || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">City</p>
                    <p>{selectedSession.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Device Type</p>
                    <p>{selectedSession.device_type || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedSession.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedSession.is_active ? 'Active' : 'Ended'}
                    </span>
                    {selectedSession.end_reason && (
                      <p className="text-xs text-gray-400 mt-1">Reason: {selectedSession.end_reason}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Created At</p>
                    <p>{new Date(selectedSession.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Last Activity</p>
                    <p>{selectedSession.last_activity_at ? new Date(selectedSession.last_activity_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Expires At</p>
                    <p>{selectedSession.expires_at ? new Date(selectedSession.expires_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Duration</p>
                    <p>{selectedSession.session_duration_seconds ? 
                      `${Math.floor(selectedSession.session_duration_seconds / 3600)}h ${Math.floor((selectedSession.session_duration_seconds % 3600) / 60)}m ${selectedSession.session_duration_seconds % 60}s` : 
                      'N/A'}</p>
                  </div>
                </div>

                {/* OS Info */}
                {selectedSession.os_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">OS Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedSession.os_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Browser Info */}
                {selectedSession.browser_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Browser Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedSession.browser_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Device Info */}
                {selectedSession.device_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Device Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedSession.device_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* User Agent */}
                {selectedSession.user_agent && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User Agent</p>
                    <p className="text-xs font-mono break-all bg-gray-900/50 p-3 rounded">
                      {selectedSession.user_agent}
                    </p>
                  </div>
                )}

                {/* Fingerprint */}
                {selectedSession.fingerprint && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Fingerprint</p>
                    <p className="text-xs font-mono break-all bg-gray-900/50 p-3 rounded">
                      {selectedSession.fingerprint}
                    </p>
                  </div>
                )}

                {/* Fingerprint Hash */}
                {selectedSession.fingerprint_hash && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Fingerprint Hash</p>
                    <p className="text-xs font-mono break-all bg-gray-900/50 p-3 rounded">
                      {selectedSession.fingerprint_hash}
                    </p>
                  </div>
                )}

                {/* Session Token (masked) */}
                {selectedSession.session_token && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Session Token (masked)</p>
                    <p className="text-xs font-mono bg-gray-900/50 p-3 rounded">
                      {selectedSession.session_token.substring(0, 20)}...{selectedSession.session_token.substring(selectedSession.session_token.length - 10)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
