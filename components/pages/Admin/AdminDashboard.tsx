import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  Shield, 
  BarChart3, 
  MapPin, 
  Coins, 
  Trophy, 
  Settings,
  Database,
  TrendingUp,
  TrendingDown,
  Clock,
  Globe,
  ArrowLeft,
  Plus,
  X
} from 'lucide-react';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { getAdminStats } from '../../../services/adminService';
import { AdminUsers } from './AdminUsers';
import { AdminActivityLog } from './AdminActivityLog';
import { AdminSessions } from './AdminSessions';
import { AdminQuests } from './AdminQuests';
import { AdminTrips } from './AdminTrips';
import { AdminTransactions } from './AdminTransactions';
import { AdminBlockchain } from './AdminBlockchain';
import { AdminAnalytics } from './AdminAnalytics';

type AdminSection = 'overview' | 'users' | 'activity' | 'sessions' | 'quests' | 'trips' | 'transactions' | 'blockchain' | 'analytics';

interface AdminDashboardProps {
  onNavigate?: (page: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { isAdmin, adminUser, loading: adminAuthLoading } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Wait for admin auth check to complete
    if (adminAuthLoading) {
      return;
    }
    
    if (!isAdmin) {
      console.log('[AdminDashboard] User is not admin');
      setLoading(false);
      return;
    }

    console.log('[AdminDashboard] User is admin, loading stats...');
    loadStats();
  }, [isAdmin, adminAuthLoading]);

  const loadStats = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminDashboard] No admin wallet address available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminDashboard] Loading stats with wallet:', adminUser.wallet_address.substring(0, 10) + '...');
      const response = await getAdminStats(adminUser.wallet_address);
      console.log('[AdminDashboard] Stats response:', response);
      if (response && response.stats) {
        setStats(response.stats);
      } else if (response) {
        // Handle case where stats might be at root level
        setStats(response);
      } else {
        console.warn('[AdminDashboard] Empty response from getAdminStats');
        setStats(null);
      }
    } catch (error: any) {
      console.error('[AdminDashboard] Error loading admin stats:', {
        message: error.message,
        stack: error.stack
      });
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'overview' as AdminSection, label: 'Overview', icon: BarChart3 },
    { id: 'users' as AdminSection, label: 'Users', icon: Users },
    { id: 'activity' as AdminSection, label: 'Activity Log', icon: Activity },
    { id: 'sessions' as AdminSection, label: 'Sessions', icon: Clock },
    { id: 'quests' as AdminSection, label: 'Quests', icon: Trophy },
    { id: 'trips' as AdminSection, label: 'Trips', icon: MapPin },
    { id: 'transactions' as AdminSection, label: 'Transactions', icon: Coins },
    { id: 'blockchain' as AdminSection, label: 'Blockchain', icon: Database },
    { id: 'analytics' as AdminSection, label: 'Analytics', icon: TrendingUp },
  ];

  const renderSection = () => {
    switch (activeSection) {
            case 'overview':
              return <OverviewSection stats={stats} loading={loading} onNavigate={onNavigate} />;
      case 'users':
        return <AdminUsers />;
      case 'activity':
        return <AdminActivityLog />;
      case 'sessions':
        return <AdminSessions />;
      case 'quests':
        return <AdminQuests />;
      case 'trips':
        return <AdminTrips />;
      case 'transactions':
        return <AdminTransactions />;
      case 'blockchain':
        return <AdminBlockchain />;
      case 'analytics':
        return <AdminAnalytics />;
      default:
        return <OverviewSection stats={stats} loading={loading} />;
    }
  };

  // Show loading while checking admin status
  if (adminAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-gray-400 mb-4">You don't have permission to access this panel.</p>
          {onNavigate && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              )}
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold">Admin Dashboard</h1>
                  <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">TripX Platform Management</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                title="Toggle Menu"
              >
                <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-400">Admin Wallet</p>
                <p className="text-xs font-mono text-cyan-400 truncate max-w-[200px]">{adminUser?.wallet_address}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex gap-4 lg:gap-8 relative">
          {/* Sidebar - Mobile: Overlay, Desktop: Fixed */}
          <aside className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0
            fixed lg:static
            inset-y-0 left-0 z-50
            w-64 flex-shrink-0
            bg-gray-900/95 lg:bg-transparent
            backdrop-blur-xl
            border-r border-gray-700 lg:border-r-0
            p-4 lg:p-0
            transition-transform duration-300 ease-in-out
            lg:transition-none
          `}>
            {/* Close button for mobile */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setSidebarOpen(false); // Close sidebar on mobile after selection
                    }}
                    className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  </motion.button>
                );
              })}
            </nav>
          </aside>

          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0 w-full lg:w-auto">
            {renderSection()}
          </main>
        </div>
      </div>
    </div>
  );
};

// Overview Section Component
const OverviewSection: React.FC<{ stats: any; loading: boolean; onNavigate?: (section: string) => void }> = ({ stats, loading, onNavigate }) => {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12">No stats available</div>;
  }

  const getTrendIndicator = (change: number, changePercent: string) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-400">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs">+{changePercent}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-400">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs">{changePercent}%</span>
        </div>
      );
    }
    return <span className="text-xs text-gray-400">No change</span>;
  };

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'blue',
      change: stats.activeUsersChange || 0,
      changePercent: stats.activeUsersChangePercent || '0',
    },
    {
      label: 'Active Users (7d)',
      value: stats.activeUsers || 0,
      icon: Activity,
      color: 'green',
      change: stats.activeUsersChange || 0,
      changePercent: stats.activeUsersChangePercent || '0',
    },
    {
      label: 'Total Quests',
      value: stats.totalQuests || 0,
      icon: Trophy,
      color: 'yellow',
    },
    {
      label: 'Completed Quests',
      value: stats.completedQuests || 0,
      icon: Trophy,
      color: 'purple',
    },
    {
      label: 'Total Trips',
      value: stats.totalTrips || 0,
      icon: MapPin,
      color: 'pink',
    },
    {
      label: 'TPX Transfers',
      value: stats.totalTPXTransfers?.toLocaleString() || stats.totalTPXMinted?.toLocaleString() || '0',
      icon: Coins,
      color: 'cyan',
    },
    {
      label: 'NFT Passports',
      value: stats.totalNFTPassports || 0,
      icon: Shield,
      color: 'indigo',
    },
    {
      label: 'Transactions',
      value: stats.totalTransactions || 0,
      icon: Database,
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Platform Overview</h2>
          <p className="text-gray-400">Real-time statistics and system health</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-cyan-500 bg-gray-900 border-gray-700 rounded focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">Auto-refresh (30s)</span>
          </label>
          <span className="text-xs text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 text-${card.color}-400`} />
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-3xl font-bold">{card.value}</p>
                    {card.change !== undefined && getTrendIndicator(card.change, card.changePercent)}
                  </div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System Health & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold mb-4">System Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Database</span>
              <span className={`px-3 py-1 rounded text-xs ${
                stats.systemHealth?.database === 'healthy' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {stats.systemHealth?.database || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">API</span>
              <span className={`px-3 py-1 rounded text-xs ${
                stats.systemHealth?.api === 'healthy' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {stats.systemHealth?.api || 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Blockchain</span>
              <span className={`px-3 py-1 rounded text-xs ${
                stats.systemHealth?.blockchain === 'healthy' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {stats.systemHealth?.blockchain || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate?.('quests')}
              className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-left"
            >
              <Plus className="w-5 h-5 mb-1" />
              <p className="text-sm font-medium">Create Quest</p>
            </button>
            <button
              onClick={() => onNavigate?.('users')}
              className="px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-left"
            >
              <Users className="w-5 h-5 mb-1" />
              <p className="text-sm font-medium">View Users</p>
            </button>
            <button
              onClick={() => onNavigate?.('transactions')}
              className="px-4 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-left"
            >
              <Database className="w-5 h-5 mb-1" />
              <p className="text-sm font-medium">View Transactions</p>
            </button>
            <button
              onClick={() => onNavigate?.('analytics')}
              className="px-4 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-left"
            >
              <BarChart3 className="w-5 h-5 mb-1" />
              <p className="text-sm font-medium">View Analytics</p>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {/* Recent Transactions */}
          {stats.recentTransactions && stats.recentTransactions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Transactions</h4>
              <div className="space-y-2">
                {stats.recentTransactions.map((tx: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{tx.users?.username || tx.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{tx.transaction_type} - {tx.amount} TPX</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Quest Completions */}
          {stats.recentQuestCompletions && stats.recentQuestCompletions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Quest Completions</h4>
              <div className="space-y-2">
                {stats.recentQuestCompletions.map((qc: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{qc.users?.username || qc.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{qc.quests?.title || 'Unknown Quest'}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {qc.completed_at ? new Date(qc.completed_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Trips */}
          {stats.recentTrips && stats.recentTrips.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Trips</h4>
              <div className="space-y-2">
                {stats.recentTrips.map((trip: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{trip.users?.username || trip.users?.wallet_address?.substring(0, 10) || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{trip.destination || trip.title || 'Unknown Destination'}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(trip.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback for old recentActivity */}
          {(!stats.recentTransactions || stats.recentTransactions.length === 0) &&
           (!stats.recentQuestCompletions || stats.recentQuestCompletions.length === 0) &&
           (!stats.recentTrips || stats.recentTrips.length === 0) &&
           stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Recent Activity</h4>
              <div className="space-y-2">
                {stats.recentActivity.map((activity: any, index: number) => (
                  <div key={activity.id || index} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{activity.action_type || 'Unknown action'}</p>
                      <p className="text-xs text-gray-400">
                        {activity.users?.username || activity.users?.wallet_address || activity.username || 'Unknown user'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Unknown time'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* No activity message */}
          {(!stats.recentTransactions || stats.recentTransactions.length === 0) &&
           (!stats.recentQuestCompletions || stats.recentQuestCompletions.length === 0) &&
           (!stats.recentTrips || stats.recentTrips.length === 0) &&
           (!stats.recentActivity || stats.recentActivity.length === 0) && (
            <p className="text-gray-400 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

