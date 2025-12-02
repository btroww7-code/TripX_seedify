import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Trophy, Coins, MapPin, Calendar, Download, RefreshCw, BarChart3, PieChart, LineChart } from 'lucide-react';
import { getAnalytics } from '../../../services/adminService';
import { useAdminAuth } from '../../../hooks/useAdminAuth';

export const AdminAnalytics: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [adminUser, dateRange]);

  const loadAnalytics = async () => {
    if (!adminUser?.wallet_address) {
      console.warn('[AdminAnalytics] No admin wallet address');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[AdminAnalytics] Loading analytics with wallet:', adminUser.wallet_address);
      const response = await getAnalytics({ dateRange }, adminUser.wallet_address);
      
      console.log('[AdminAnalytics] Response:', response);
      
      // Response is the analytics data directly, not wrapped
      if (response) {
        setAnalytics(response);
      } else {
        console.warn('[AdminAnalytics] Unexpected response format:', response);
        setAnalytics(null);
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      alert(`Failed to load analytics: ${error.message || 'Unknown error'}`);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const SimpleLineChart = ({ data, label, color = 'cyan' }: { data: any[], label: string, color?: string }) => {
    if (!data || data.length === 0) return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
    
    try {
      const values = data.map(d => d.users || d.completions || d.volume || d.active_users || 0);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const range = maxValue - minValue || 1;
      
      const points = data.map((d, i) => {
        const value = d.users || d.completions || d.volume || d.active_users || 0;
        const x = data.length > 1 ? (i / (data.length - 1)) * 100 : (data.length === 1 ? 50 : 0);
        const y = range > 0 ? 100 - ((value - minValue) / range) * 80 : 50;
        return `${x},${y}`;
      }).join(' ');

      // Map color names to RGB values with gradients
      const colorMap: { [key: string]: { stroke: string, fill: string, glow: string } } = {
        cyan: { stroke: 'rgb(6, 182, 212)', fill: 'rgba(6, 182, 212, 0.1)', glow: 'rgba(6, 182, 212, 0.3)' },
        yellow: { stroke: 'rgb(234, 179, 8)', fill: 'rgba(234, 179, 8, 0.1)', glow: 'rgba(234, 179, 8, 0.3)' },
        green: { stroke: 'rgb(34, 197, 94)', fill: 'rgba(34, 197, 94, 0.1)', glow: 'rgba(34, 197, 94, 0.3)' },
        blue: { stroke: 'rgb(59, 130, 246)', fill: 'rgba(59, 130, 246, 0.1)', glow: 'rgba(59, 130, 246, 0.3)' },
        purple: { stroke: 'rgb(168, 85, 247)', fill: 'rgba(168, 85, 247, 0.1)', glow: 'rgba(168, 85, 247, 0.3)' },
      };
      const colors = colorMap[color] || colorMap.cyan;
      const areaPoints = `${points} 100,100 0,100`;

      return (
        <motion.div 
          className="relative h-48 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.fill} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors.fill} stopOpacity="0" />
              </linearGradient>
              <filter id={`glow-${color}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Area fill */}
            <motion.polygon
              fill={`url(#gradient-${color})`}
              points={areaPoints}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            {/* Line with glow */}
            <motion.polyline
              fill="none"
              stroke={colors.stroke}
              strokeWidth="3"
              points={points}
              filter={`url(#glow-${color})`}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
            {/* Data points */}
            {data.map((d, i) => {
              const value = d.users || d.completions || d.volume || d.active_users || 0;
              const x = data.length > 1 ? (i / (data.length - 1)) * 100 : (data.length === 1 ? 50 : 0);
              const y = range > 0 ? 100 - ((value - minValue) / range) * 80 : 50;
              return (
                <motion.circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={colors.stroke}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.5 + i * 0.1, duration: 0.3 }}
                />
              );
            })}
          </svg>
          <div className="absolute bottom-0 left-0 right-0 text-xs text-gray-400 text-center pt-2">
            {label}
          </div>
          <div className="absolute top-2 right-2 text-xs font-bold" style={{ color: colors.stroke }}>
            Max: {maxValue.toLocaleString()}
          </div>
        </motion.div>
      );
    } catch (error) {
      console.error('Error rendering line chart:', error);
      return <p className="text-gray-400 text-sm">Error rendering chart</p>;
    }
  };

  const SimpleBarChart = ({ data, label, color = 'cyan' }: { data: any[], label: string, color?: string }) => {
    if (!data || data.length === 0) return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
    
    const maxValue = Math.max(...data.map(d => d.count || 0));
    
    // Map color names to actual Tailwind classes with gradients
    const colorClasses: { [key: string]: { bg: string, gradient: string } } = {
      cyan: { bg: 'bg-cyan-500', gradient: 'from-cyan-500 to-cyan-600' },
      blue: { bg: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600' },
      purple: { bg: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600' },
      yellow: { bg: 'bg-yellow-500', gradient: 'from-yellow-500 to-yellow-600' },
      green: { bg: 'bg-green-500', gradient: 'from-green-500 to-green-600' },
      red: { bg: 'bg-red-500', gradient: 'from-red-500 to-red-600' },
    };
    const colors = colorClasses[color] || colorClasses.cyan;
    
    return (
      <div className="space-y-3">
        {data.slice(0, 10).map((item, index) => {
          const percentage = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
          return (
            <motion.div
              key={index}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <div className="flex-1 bg-gray-700/30 rounded-full h-8 relative overflow-hidden border border-gray-600/30">
                <motion.div
                  className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full shadow-lg`}
                  style={{ width: `${percentage}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-semibold truncate px-3 z-10">
                  {item.country || item.city || item.title || item.user || 'Unknown'}
                </span>
              </div>
              <motion.span
                className="text-sm text-gray-200 w-20 text-right font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.5 }}
              >
                {item.count.toLocaleString()}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const SimplePieChart = ({ data }: { data: any[] }) => {
    if (!data || data.length === 0) return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
    
    try {
      const total = data.reduce((sum, item) => sum + (parseFloat(item.tokens) || 0), 0);
      if (total === 0) return (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-400 text-sm">No token data</p>
        </div>
      );
      
      let currentAngle = 0;
      const colors = [
        { fill: '#06b6d4', glow: 'rgba(6, 182, 212, 0.5)' },
        { fill: '#3b82f6', glow: 'rgba(59, 130, 246, 0.5)' },
        { fill: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.5)' },
        { fill: '#ec4899', glow: 'rgba(236, 72, 153, 0.5)' },
        { fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)' },
        { fill: '#10b981', glow: 'rgba(16, 185, 129, 0.5)' },
        { fill: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)' }
      ];
      
      return (
        <motion.div
          className="relative h-64 w-64 mx-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
            <defs>
              {colors.map((color, idx) => (
                <filter key={idx} id={`pieGlow${idx}`}>
                  <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              ))}
            </defs>
            {data.slice(0, 7).map((item, index) => {
              const value = parseFloat(item.tokens) || 0;
              if (value === 0) return null;
              
              const percentage = (value / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              currentAngle += angle;
              
              const startAngleRad = (startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (endAngle - 90) * (Math.PI / 180);
              const largeArc = angle > 180 ? 1 : 0;
              
              const x1 = 50 + 40 * Math.cos(startAngleRad);
              const y1 = 50 + 40 * Math.sin(startAngleRad);
              const x2 = 50 + 40 * Math.cos(endAngleRad);
              const y2 = 50 + 40 * Math.sin(endAngleRad);
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              const colorData = colors[index % colors.length];
              
              return (
                <motion.path
                  key={index}
                  d={pathData}
                  fill={colorData.fill}
                  opacity={0.85}
                  filter={`url(#pieGlow${index})`}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.8, ease: "easeInOut" }}
                  whileHover={{ opacity: 1, scale: 1.05, transformOrigin: '50% 50%' }}
                />
              );
            })}
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            <div className="text-center">
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.3 }}
              >
                {total.toLocaleString()}
              </motion.p>
              <p className="text-xs text-gray-400 mt-1">Total TPX</p>
            </div>
          </motion.div>
        </motion.div>
      );
    } catch (error) {
      console.error('Error rendering pie chart:', error);
      return <p className="text-gray-400 text-sm">Error rendering chart</p>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2">Analytics & Insights</h2>
          <p className="text-gray-400">Platform analytics and trends</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards with Premium Effects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30 shadow-lg shadow-blue-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <div className="text-right">
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {analytics.userGrowth && analytics.userGrowth.length > 0
                  ? analytics.userGrowth[analytics.userGrowth.length - 1]?.users || analytics.users?.total || 0
                  : analytics.users?.total || 0}
              </motion.p>
              <p className="text-sm text-gray-400 mt-1">Total Users</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="text-right">
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {analytics.questTrends?.reduce((sum: number, item: any) => sum + (item.completions || 0), 0) || analytics.quests?.total || 0}
              </motion.p>
              <p className="text-sm text-gray-400 mt-1">Quest Completions</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="p-3 bg-cyan-500/20 rounded-lg">
              <Coins className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="text-right">
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {analytics.transactionVolume?.reduce((sum: number, item: any) => sum + (parseFloat(item.volume?.toString() || '0') || 0), 0).toLocaleString() || analytics.transactions?.totalAmount?.toLocaleString() || '0'}
              </motion.p>
              <p className="text-sm text-gray-400 mt-1">TPX Volume</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -5 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-right">
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {analytics.topCountries?.length || 0}
              </motion.p>
              <p className="text-sm text-gray-400 mt-1">Active Countries</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid with Premium Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <LineChart className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold">User Growth</h3>
            </div>
            <SimpleLineChart data={analytics.userGrowth || analytics.users?.data || []} label="Users over time" color="cyan" />
          </div>
        </motion.div>

        {/* Quest Completion Trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold">Quest Completion Trends</h3>
            </div>
            <SimpleLineChart data={analytics.questTrends || analytics.quests?.data || []} label="Completions over time" color="yellow" />
          </div>
        </motion.div>

        {/* Token Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PieChart className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold">Token Distribution</h3>
            </div>
            <SimplePieChart data={analytics.tokenDistribution || []} />
            <div className="mt-6 space-y-3">
              {(analytics.tokenDistribution || []).slice(0, 5).map((item: any, index: number) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-gray-900/30 rounded-lg"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + index * 0.1 }}
                >
                  <span className="text-gray-300 truncate font-medium">{item.user || 'Unknown'}</span>
                  <span className="text-purple-400 font-bold">{(parseFloat(item.tokens?.toString() || '0') || 0).toLocaleString()} TPX</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Transaction Volume */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-xl font-bold">Transaction Volume</h3>
            </div>
            <SimpleLineChart data={analytics.transactionVolume || analytics.transactions?.data || []} label="Volume over time" color="green" />
          </div>
        </motion.div>
      </div>

      {/* Top Lists with Premium Effects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30 shadow-lg shadow-blue-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold">Top Countries</h3>
            </div>
            <SimpleBarChart data={analytics.topCountries || []} label="Countries" color="blue" />
          </div>
        </motion.div>

        {/* Top Cities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30 shadow-lg shadow-purple-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold">Top Cities</h3>
            </div>
            <SimpleBarChart data={analytics.topCities || []} label="Cities" color="purple" />
          </div>
        </motion.div>

        {/* Top Quests */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold">Top Quests</h3>
            </div>
            <SimpleBarChart data={analytics.topQuests || []} label="Quests" color="yellow" />
          </div>
        </motion.div>
      </div>

      {/* Active Users Over Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-xl p-6 border border-green-500/30 shadow-lg shadow-green-500/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-xl font-bold">Active Users Over Time</h3>
          </div>
          <SimpleLineChart data={analytics.activeUsers || []} label="Active users" color="green" />
        </div>
      </motion.div>
    </div>
  );
};
