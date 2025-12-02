import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Ban, CheckCircle, Edit, Eye, Trash2, Coins, Award, Copy, X, Save, Plus, Minus, MapPin, Globe, Monitor, Smartphone, Tablet, Laptop, Shield, Activity, Clock, Wifi, Fingerprint, Map, Flag, Building2 } from 'lucide-react';
import { getAllUsers, getUserDetails, banUser, unbanUser, updateUser, deleteUser, addTokens, addXP, AdminUser as AdminUserType } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { ScrollableTable } from '../../ScrollableTable';

export const AdminUsers: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showXPModal, setShowXPModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    email: '',
    level: '',
    total_xp: '',
  });
  const [tokensFormData, setTokensFormData] = useState({
    amount: '',
    operation: 'add' as 'add' | 'subtract',
    reason: '',
  });
  const [xpFormData, setXPFormData] = useState({
    amount: '',
    operation: 'add' as 'add' | 'subtract',
    reason: '',
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [compactView, setCompactView] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, [page, search, adminUser]);

  const loadUsers = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminUsers] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminUsers] Loading users with wallet:', adminUser.wallet_address);
      const response = await getAllUsers({
        search: search || undefined,
        limit,
        offset: (page - 1) * limit,
        sortBy: 'created_at',
        sortOrder: 'desc',
      }, adminUser.wallet_address);
      
      console.log('[AdminUsers] Response:', response);
      
      if (response && response.users) {
        setUsers(response.users);
        setTotal(response.total || 0);
      } else {
        console.warn('[AdminUsers] Unexpected response format:', response);
        setUsers([]);
        setTotal(0);
      }
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert(`Failed to load users: ${error.message || 'Unknown error'}`);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (userId: string) => {
    try {
      const details = await getUserDetails(userId, adminUser?.wallet_address || undefined);
      setSelectedUser(details);
    } catch (error) {
      console.error('Error loading user details:', error);
      alert('Failed to load user details');
    }
  };

  const handleEdit = (user: AdminUserType) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email || '',
      level: user.level?.toString() || '1',
      total_xp: user.total_xp?.toString() || '0',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        username: editFormData.username || undefined,
        email: editFormData.email || undefined,
        level: parseInt(editFormData.level) || undefined,
        total_xp: parseInt(editFormData.total_xp) || undefined,
      }, adminUser?.wallet_address);
      
      alert('User updated successfully!');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(`Failed to update user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteUser(userId, adminUser?.wallet_address);
      alert('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBan = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    try {
      await banUser(userId, undefined, adminUser?.wallet_address || undefined);
      loadUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await unbanUser(userId, adminUser?.wallet_address || undefined);
      loadUsers();
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user');
    }
  };

  const handleAddTokens = async (userId: string) => {
    if (!tokensFormData.amount || isNaN(parseFloat(tokensFormData.amount))) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await addTokens(
        userId,
        parseFloat(tokensFormData.amount),
        tokensFormData.operation,
        tokensFormData.reason,
        adminUser?.wallet_address
      );
      alert(`Tokens ${tokensFormData.operation === 'add' ? 'added' : 'subtracted'} successfully!`);
      setShowTokensModal(false);
      setTokensFormData({ amount: '', operation: 'add', reason: '' });
      loadUsers();
      if (selectedUser && selectedUser.user?.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error: any) {
      console.error('Error updating tokens:', error);
      alert(`Failed to update tokens: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddXP = async (userId: string) => {
    if (!xpFormData.amount || isNaN(parseInt(xpFormData.amount))) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      await addXP(
        userId,
        parseInt(xpFormData.amount),
        xpFormData.operation,
        xpFormData.reason,
        adminUser?.wallet_address
      );
      alert(`XP ${xpFormData.operation === 'add' ? 'added' : 'subtracted'} successfully!`);
      setShowXPModal(false);
      setXPFormData({ amount: '', operation: 'add', reason: '' });
      loadUsers();
      if (selectedUser && selectedUser.user?.id === userId) {
        handleViewDetails(userId);
      }
    } catch (error: any) {
      console.error('Error updating XP:', error);
      alert(`Failed to update XP: ${error.message || 'Unknown error'}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Users Management</h2>
          <p className="text-gray-400">Manage all platform users</p>
        </div>
        <button
          onClick={() => setCompactView(!compactView)}
          className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          {compactView ? 'Full View' : 'Compact View'}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by wallet, email, or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden p-4">
            <ScrollableTable minWidth={compactView ? '800px' : '2000px'}>
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">User</th>
                    {!compactView && (
                      <>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Wallet/Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Location</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">IP Address</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Device/OS</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Browser</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Tokens</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Countries</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Last Active</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">XP</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Level</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Quests</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{user.username || 'No username'}</p>
                          <p className="text-sm text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>
                      {!compactView && (
                        <>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm">
                                {user.wallet_address || user.email || 'N/A'}
                              </p>
                              {(user.wallet_address || user.email) && (
                                <button
                                  onClick={() => copyToClipboard(user.wallet_address || user.email || '')}
                                  className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                                  title="Copy"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {user.osint?.country || user.osint?.city ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <span className="text-sm text-blue-400">
                                  {user.osint.country || 'Unknown'}
                                  {user.osint.city && `, ${user.osint.city}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {user.osint?.ip_address ? (
                              <div className="flex items-center gap-1">
                                <Wifi className="w-3 h-3 text-green-400" />
                                <span className="font-mono text-xs text-green-400">
                                  {user.osint.ip_address}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(user.osint?.ip_address || '')}
                                  className="p-0.5 text-gray-400 hover:text-green-400 transition-colors"
                                  title="Copy IP"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {user.osint?.device_type || user.osint?.os ? (
                              <div className="flex items-center gap-1">
                                {user.osint.device_type === 'mobile' && <Smartphone className="w-3 h-3 text-purple-400" />}
                                {user.osint.device_type === 'tablet' && <Tablet className="w-3 h-3 text-purple-400" />}
                                {(user.osint.device_type === 'desktop' || !user.osint.device_type) && <Monitor className="w-3 h-3 text-purple-400" />}
                                <span className="text-xs text-purple-400 capitalize">
                                  {user.osint.device_type || 'Desktop'}
                                </span>
                                {user.osint.os && (
                                  <span className="text-xs text-gray-500">/ {user.osint.os}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {user.osint?.browser ? (
                              <span className="text-xs text-cyan-400">{user.osint.browser}</span>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {user.total_tokens_earned ? user.total_tokens_earned.toLocaleString() : '0'} TPX
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {user.countries_visited?.length || 0} countries
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {user.last_active_at ? new Date(user.last_active_at).toLocaleDateString() : 'Never'}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4">{user.total_xp?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm">
                          {user.level || 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">{user.quests_completed || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          user.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {user.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleViewDetails(user.id)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded transition-colors"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.is_banned ? (
                            <button
                              onClick={() => handleUnban(user.id)}
                              className="p-2 text-green-400 hover:bg-green-500/20 rounded transition-colors"
                              title="Unban User"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBan(user.id)}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title="Ban User"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-red-600 hover:bg-red-600/20 rounded transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} users
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* User Details Modal with Premium OSINT */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    User Intelligence Report
                  </h3>
                  <p className="text-gray-400 mt-1">{selectedUser.user?.username || selectedUser.user?.wallet_address || 'Unknown User'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowTokensModal(true);
                      setTokensFormData({ amount: '', operation: 'add', reason: '' });
                    }}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all hover:scale-105 flex items-center gap-1 text-sm"
                  >
                    <Coins className="w-4 h-4" />
                    Tokens
                  </button>
                  <button
                    onClick={() => {
                      setShowXPModal(true);
                      setXPFormData({ amount: '', operation: 'add', reason: '' });
                    }}
                    className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all hover:scale-105 flex items-center gap-1 text-sm"
                  >
                    <Award className="w-4 h-4" />
                    XP
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                </div>
              </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Wallet</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm truncate">{selectedUser.user?.wallet_address?.substring(0, 12) || 'N/A'}...</p>
                    {selectedUser.user?.wallet_address && (
                      <button
                        onClick={() => copyToClipboard(selectedUser.user.wallet_address)}
                        className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">Level</p>
                  <p className="text-xl font-bold text-cyan-400">{selectedUser.user?.level || 1}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">XP</p>
                  <p className="text-xl font-bold text-yellow-400">{selectedUser.user?.total_xp?.toLocaleString() || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-4 border border-gray-700/50">
                  <p className="text-xs text-gray-400 mb-1">TPX</p>
                  <p className="text-xl font-bold text-green-400">{selectedUser.user?.total_tokens_earned?.toLocaleString() || 0}</p>
                </div>
              </motion.div>

              {/* OSINT Overview Stats */}
              {selectedUser.osint && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-6 h-6 text-cyan-400" />
                      <h4 className="text-xl font-bold">OSINT Intelligence Overview</h4>
                </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-blue-400" />
                          <p className="text-xs text-gray-400">Countries</p>
                </div>
                        <p className="text-2xl font-bold text-blue-400">{selectedUser.osint.stats.uniqueCountries}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.35 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-purple-400" />
                          <p className="text-xs text-gray-400">Cities</p>
                </div>
                        <p className="text-2xl font-bold text-purple-400">{selectedUser.osint.stats.uniqueCities}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-green-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Wifi className="w-4 h-4 text-green-400" />
                          <p className="text-xs text-gray-400">IP Addresses</p>
                </div>
                        <p className="text-2xl font-bold text-green-400">{selectedUser.osint.stats.uniqueIPs}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.45 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-yellow-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Fingerprint className="w-4 h-4 text-yellow-400" />
                          <p className="text-xs text-gray-400">Fingerprints</p>
                </div>
                        <p className="text-2xl font-bold text-yellow-400">{selectedUser.osint.stats.uniqueFingerprints}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-cyan-400" />
                          <p className="text-xs text-gray-400">Sessions</p>
                </div>
                        <p className="text-2xl font-bold text-cyan-400">{selectedUser.osint.stats.totalSessions}</p>
                        <p className="text-xs text-gray-500 mt-1">{selectedUser.osint.stats.activeSessions} active</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.55 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-pink-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Monitor className="w-4 h-4 text-pink-400" />
                          <p className="text-xs text-gray-400">Devices</p>
                </div>
                        <p className="text-2xl font-bold text-pink-400">{selectedUser.osint.stats.uniqueDevices}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-indigo-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Laptop className="w-4 h-4 text-indigo-400" />
                          <p className="text-xs text-gray-400">OS Types</p>
                </div>
                        <p className="text-2xl font-bold text-indigo-400">{selectedUser.osint.stats.uniqueOS}</p>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.65 }}
                        className="bg-gray-900/50 rounded-lg p-4 border border-orange-500/30"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-orange-400" />
                          <p className="text-xs text-gray-400">Browsers</p>
              </div>
                        <p className="text-2xl font-bold text-orange-400">{selectedUser.osint.stats.uniqueBrowsers}</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Current Location */}
                  {selectedUser.osint.mostRecentSession && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-6 h-6 text-green-400" />
                        <h4 className="text-xl font-bold">Current Location & Connection</h4>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Flag className="w-4 h-4 text-green-400" />
                            <p className="text-xs text-gray-400">Country</p>
                          </div>
                          <p className="text-lg font-bold text-green-400">{selectedUser.osint.mostRecentSession.country || 'Unknown'}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-4 h-4 text-blue-400" />
                            <p className="text-xs text-gray-400">City</p>
                          </div>
                          <p className="text-lg font-bold text-blue-400">{selectedUser.osint.mostRecentSession.city || 'Unknown'}</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Wifi className="w-4 h-4 text-cyan-400" />
                            <p className="text-xs text-gray-400">IP Address</p>
                            {selectedUser.osint.mostRecentSession.ip_address && (
                              <button
                                onClick={() => copyToClipboard(selectedUser.osint.mostRecentSession.ip_address)}
                                className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                    )}
                  </div>
                          <p className="text-lg font-bold text-cyan-400 font-mono">{selectedUser.osint.mostRecentSession.ip_address || 'Unknown'}</p>
                </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Device Fingerprint */}
                  {selectedUser.osint.mostRecentSession && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-6 border border-yellow-500/30 shadow-lg shadow-yellow-500/10"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Fingerprint className="w-6 h-6 text-yellow-400" />
                        <h4 className="text-xl font-bold">Device Fingerprint & Hardware</h4>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-yellow-500/20">
                            <p className="text-xs text-gray-400 mb-1">Fingerprint Hash</p>
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-sm text-yellow-400 truncate">
                                {selectedUser.osint.mostRecentSession.fingerprint_hash || selectedUser.osint.mostRecentSession.fingerprint || 'N/A'}
                              </p>
                              {(selectedUser.osint.mostRecentSession.fingerprint_hash || selectedUser.osint.mostRecentSession.fingerprint) && (
                                <button
                                  onClick={() => copyToClipboard(selectedUser.osint.mostRecentSession.fingerprint_hash || selectedUser.osint.mostRecentSession.fingerprint)}
                                  className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                    )}
                  </div>
                </div>
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/20">
                            <p className="text-xs text-gray-400 mb-1">Device Type</p>
                            <div className="flex items-center gap-2">
                              {selectedUser.osint.mostRecentSession.device_type === 'mobile' && <Smartphone className="w-4 h-4 text-purple-400" />}
                              {selectedUser.osint.mostRecentSession.device_type === 'tablet' && <Tablet className="w-4 h-4 text-purple-400" />}
                              {(selectedUser.osint.mostRecentSession.device_type === 'desktop' || !selectedUser.osint.mostRecentSession.device_type) && <Monitor className="w-4 h-4 text-purple-400" />}
                              <p className="text-sm font-semibold text-purple-400 capitalize">
                                {selectedUser.osint.mostRecentSession.device_type || 'Desktop'}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/20">
                            <p className="text-xs text-gray-400 mb-1">Operating System</p>
                            <p className="text-sm font-semibold text-blue-400">
                              {selectedUser.osint.mostRecentSession.os_info?.name || selectedUser.osint.mostRecentSession.os || 'Unknown'} 
                              {selectedUser.osint.mostRecentSession.os_info?.version && ` ${selectedUser.osint.mostRecentSession.os_info.version}`}
                            </p>
                            {selectedUser.osint.mostRecentSession.os_info && (
                              <p className="text-xs text-gray-500 mt-1">
                                Platform: {selectedUser.osint.mostRecentSession.os_info.platform || 'N/A'}
                              </p>
                            )}
                          </div>
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-cyan-500/20">
                            <p className="text-xs text-gray-400 mb-1">Browser</p>
                            <p className="text-sm font-semibold text-cyan-400">
                              {selectedUser.osint.mostRecentSession.browser_info?.name || selectedUser.osint.mostRecentSession.browser || 'Unknown'}
                              {selectedUser.osint.mostRecentSession.browser_info?.version && ` ${selectedUser.osint.mostRecentSession.browser_info.version}`}
                            </p>
                            {selectedUser.osint.mostRecentSession.browser_info && (
                              <p className="text-xs text-gray-500 mt-1">
                                Engine: {selectedUser.osint.mostRecentSession.browser_info.engine || 'N/A'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 col-span-1 md:col-span-2">
                          <p className="text-xs text-gray-400 mb-1">User Agent</p>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-xs text-gray-300 truncate flex-1">
                              {selectedUser.osint.mostRecentSession.user_agent || 'N/A'}
                            </p>
                            {selectedUser.osint.mostRecentSession.user_agent && (
                              <button
                                onClick={() => copyToClipboard(selectedUser.osint.mostRecentSession.user_agent)}
                                className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Location History */}
                  {selectedUser.osint.uniqueCountries && selectedUser.osint.uniqueCountries.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-6 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Map className="w-6 h-6 text-blue-400" />
                        <h4 className="text-xl font-bold">Location History</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                          <p className="text-sm text-gray-400 mb-2">Countries Visited ({selectedUser.osint.uniqueCountries.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.osint.uniqueCountries.map((country: string, idx: number) => (
                              <motion.span
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.6 + idx * 0.05 }}
                                className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm border border-blue-500/30"
                              >
                                {country}
                              </motion.span>
                            ))}
                        </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Cities Visited ({selectedUser.osint.uniqueCities.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedUser.osint.uniqueCities.slice(0, 10).map((city: string, idx: number) => (
                              <motion.span
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7 + idx * 0.05 }}
                                className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm border border-purple-500/30"
                              >
                                {city}
                              </motion.span>
                            ))}
                            {selectedUser.osint.uniqueCities.length > 10 && (
                              <span className="px-3 py-1 bg-gray-700/50 text-gray-400 rounded-lg text-sm">
                                +{selectedUser.osint.uniqueCities.length - 10} more
                              </span>
                    )}
                  </div>
                </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Session History */}
                  {selectedUser.osint.allSessions && selectedUser.osint.allSessions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-6 h-6 text-cyan-400" />
                        <h4 className="text-xl font-bold">Session History ({selectedUser.osint.allSessions.length})</h4>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedUser.osint.allSessions.slice(0, 10).map((session: any, idx: number) => (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 + idx * 0.05 }}
                            className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-cyan-500/50 transition-colors"
                          >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                                <p className="text-xs text-gray-400">Date</p>
                                <p className="text-cyan-400">{new Date(session.created_at).toLocaleString()}</p>
                        </div>
                              <div>
                                <p className="text-xs text-gray-400">Location</p>
                                <p className="text-blue-400">{session.country || 'Unknown'}, {session.city || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">IP</p>
                                <p className="font-mono text-xs text-green-400">{session.ip_address || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Status</p>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  session.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {session.is_active ? 'Active' : 'Ended'}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mt-2">
                              <div>
                                <span className="text-gray-500">Device: </span>
                                <span className="text-purple-400 capitalize">{session.device_type || 'Desktop'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">OS: </span>
                                <span className="text-blue-400">{session.os || 'Unknown'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Browser: </span>
                                <span className="text-cyan-400">{session.browser || 'Unknown'}</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </>
              )}

              {/* Fallback if no OSINT data */}
              {!selectedUser.osint && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 text-center"
                >
                  <p className="text-gray-400">No OSINT data available for this user</p>
                </motion.div>
              )}

              {/* Basic User Info (if no OSINT) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <p className="text-sm text-gray-400 mb-1">Quests Completed</p>
                  <p className="text-lg font-bold">{selectedUser.quests?.length || 0}</p>
                  </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Trips Created</p>
                  <p className="text-lg font-bold">{selectedUser.trips?.length || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Transactions</p>
                  <p className="text-lg font-bold">{selectedUser.transactions?.length || 0}</p>
              </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created At</p>
                  <p className="text-sm">{new Date(selectedUser.user?.created_at).toLocaleString()}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Edit User</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Level</label>
                    <input
                      type="number"
                      min="1"
                      value={editFormData.level}
                      onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Total XP</label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.total_xp}
                      onChange={(e) => setEditFormData({ ...editFormData, total_xp: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Remove Tokens Modal */}
      {showTokensModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Manage Tokens</h3>
                <button
                  onClick={() => setShowTokensModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Operation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTokensFormData({ ...tokensFormData, operation: 'add' })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        tokensFormData.operation === 'add'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={() => setTokensFormData({ ...tokensFormData, operation: 'subtract' })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        tokensFormData.operation === 'subtract'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      Subtract
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (TPX)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tokensFormData.amount}
                    onChange={(e) => setTokensFormData({ ...tokensFormData, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={tokensFormData.reason}
                    onChange={(e) => setTokensFormData({ ...tokensFormData, reason: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Admin adjustment, reward, etc."
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setShowTokensModal(false)}
                    className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddTokens(selectedUser.user?.id)}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                  >
                    {tokensFormData.operation === 'add' ? 'Add' : 'Subtract'} Tokens
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Remove XP Modal */}
      {showXPModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Manage XP</h3>
                <button
                  onClick={() => setShowXPModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Operation</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setXPFormData({ ...xpFormData, operation: 'add' })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        xpFormData.operation === 'add'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={() => setXPFormData({ ...xpFormData, operation: 'subtract' })}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                        xpFormData.operation === 'subtract'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      Subtract
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Amount (XP)</label>
                  <input
                    type="number"
                    min="0"
                    value={xpFormData.amount}
                    onChange={(e) => setXPFormData({ ...xpFormData, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reason (optional)</label>
                  <input
                    type="text"
                    value={xpFormData.reason}
                    onChange={(e) => setXPFormData({ ...xpFormData, reason: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Admin adjustment, reward, etc."
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setShowXPModal(false)}
                    className="px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAddXP(selectedUser.user?.id)}
                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                  >
                    {xpFormData.operation === 'add' ? 'Add' : 'Subtract'} XP
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
