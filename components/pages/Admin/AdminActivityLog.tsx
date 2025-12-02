import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { getActivityLog, ActivityLogEntry } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminActivityLog: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    userId: '',
    actionType: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const limit = 50;

  useEffect(() => {
    loadLogs();
  }, [page, filters, adminUser]);

  const loadLogs = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminActivityLog] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminActivityLog] Loading logs with wallet:', adminUser.wallet_address);
      const response = await getActivityLog({
        userId: filters.userId || undefined,
        actionType: filters.actionType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        limit,
        offset: (page - 1) * limit,
      }, adminUser.wallet_address);
      
      console.log('[AdminActivityLog] Response:', response);
      console.log('[AdminActivityLog] Logs count:', response?.logs?.length || 0);
      console.log('[AdminActivityLog] Total:', response?.total || 0);
      
      if (response && response.logs) {
        // Filter by search if provided
        let filtered = response.logs;
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter((log: ActivityLogEntry) => 
            log.fingerprint_hash?.toLowerCase().includes(searchLower) ||
            log.user_agent?.toLowerCase().includes(searchLower) ||
            log.ip_address?.toLowerCase().includes(searchLower) ||
            log.username?.toLowerCase().includes(searchLower) ||
            log.wallet_address?.toLowerCase().includes(searchLower)
          );
        }
        console.log('[AdminActivityLog] Filtered logs count:', filtered.length);
        setLogs(filtered);
        setTotal(response.total || 0);
      } else {
        console.warn('[AdminActivityLog] Unexpected response format:', response);
        console.warn('[AdminActivityLog] Response keys:', response ? Object.keys(response) : 'null');
        setLogs([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading activity log:', error);
      alert(`Failed to load activity log: ${error.message || 'Unknown error'}`);
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'User', 'Action Type', 'IP Address', 'Country', 'City', 'Device Type', 'OS', 'Browser', 'Fingerprint Hash'];
    const rows = logs.map(log => [
      new Date(log.action_timestamp || log.timestamp || '').toLocaleString(),
      log.username || log.wallet_address || 'Unknown',
      log.action_type,
      log.ip_address || 'N/A',
      log.country || 'N/A',
      log.city || 'N/A',
      log.device_type || 'N/A',
      log.os_info?.name ? `${log.os_info.name} ${log.os_info.version}` : 'N/A',
      log.browser_info?.name ? `${log.browser_info.name} ${log.browser_info.version}` : 'N/A',
      log.fingerprint_hash || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Activity Log</h2>
          <p className="text-gray-400">Comprehensive log of all user actions with detailed device and location info</p>
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
              placeholder="Search by fingerprint, user agent, IP..."
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
            placeholder="Action Type"
            value={filters.actionType}
            onChange={(e) => {
              setFilters({ ...filters, actionType: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => {
              setFilters({ ...filters, startDate: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => {
              setFilters({ ...filters, endDate: e.target.value });
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Logs Table */}
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
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Timestamp</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Action</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">IP Address</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Device</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">OS</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Browser</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Fingerprint</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-400">
                        No activity logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm">
                          {new Date(log.action_timestamp || log.timestamp || '').toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{log.username || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 font-mono">
                            {log.wallet_address?.substring(0, 10) || 'N/A'}...
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono">{log.ip_address || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                          {log.city && log.country ? (
                            <div>
                              <p>{log.city}</p>
                              <p className="text-xs text-gray-400">{log.country}</p>
                            </div>
                          ) : log.country ? (
                            <p>{log.country}</p>
                          ) : (
                            <span className="text-gray-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {log.device_type || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {log.os_info && typeof log.os_info === 'object' ? (
                            <div>
                              <p>{log.os_info.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{log.os_info.version || ''} {log.os_info.architecture || ''}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {log.browser_info && typeof log.browser_info === 'object' ? (
                            <div>
                              <p>{log.browser_info.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-400">{log.browser_info.version || ''} ({log.browser_info.engine || ''})</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs text-gray-400">
                            {log.fingerprint_hash ? log.fingerprint_hash.substring(0, 16) + '...' : 'N/A'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedLog(log)}
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
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Activity Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Action Type</p>
                    <p className="font-medium">{selectedLog.action_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User</p>
                    <p>{selectedLog.username || selectedLog.wallet_address || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Location</p>
                    <p>{selectedLog.city && selectedLog.country ? `${selectedLog.city}, ${selectedLog.country}` : selectedLog.country || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Device Type</p>
                    <p>{selectedLog.device_type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Timestamp</p>
                    <p>{new Date(selectedLog.action_timestamp || selectedLog.timestamp || '').toLocaleString()}</p>
                  </div>
                </div>

                {/* OS Info */}
                {selectedLog.os_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">OS Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedLog.os_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Browser Info */}
                {selectedLog.browser_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Browser Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedLog.browser_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Device Info */}
                {selectedLog.device_info && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Device Information</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto">
                      {JSON.stringify(selectedLog.device_info, null, 2)}
                    </pre>
                  </div>
                )}

                {/* User Agent */}
                {selectedLog.user_agent && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">User Agent</p>
                    <p className="text-xs font-mono break-all bg-gray-900/50 p-3 rounded">
                      {selectedLog.user_agent}
                    </p>
                  </div>
                )}

                {/* Fingerprint Hash */}
                {selectedLog.fingerprint_hash && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Fingerprint Hash</p>
                    <p className="text-xs font-mono break-all bg-gray-900/50 p-3 rounded">
                      {selectedLog.fingerprint_hash}
                    </p>
                  </div>
                )}

                {/* Action Details */}
                {selectedLog.action_details && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Action Details</p>
                    <pre className="text-xs bg-gray-900/50 p-4 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedLog.action_details, null, 2)}
                    </pre>
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
