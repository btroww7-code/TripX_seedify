import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, MapPin, Calendar, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { getTripStatistics } from '../../../services/tripService';

interface TripStatsPanelProps {
  userId: string;
}

export const TripStatsPanel: React.FC<TripStatsPanelProps> = ({ userId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    try {
      const data = await getTripStatistics(userId);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) return null;

  const statItems = [
    {
      icon: MapPin,
      label: 'Trips Created',
      value: stats.totalTrips,
      color: 'cyan',
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: stats.completedTrips,
      color: 'green',
    },
    {
      icon: Clock,
      label: 'Active Trips',
      value: stats.activeTrips,
      color: 'purple',
    },
    {
      icon: Calendar,
      label: 'Total Days',
      value: stats.totalDays,
      color: 'amber',
    },
    {
      icon: TrendingUp,
      label: 'Countries',
      value: stats.countriesVisited,
      color: 'pink',
    },
    {
      icon: DollarSign,
      label: 'Total Budget',
      value: `$${Math.round(stats.totalCost).toLocaleString()}`,
      color: 'emerald',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-xl p-4 backdrop-blur-xl bg-white/5 border border-white/10"
        >
          <div className={`w-10 h-10 rounded-lg bg-${item.color}-500/20 flex items-center justify-center mb-3`}>
            <item.icon className={`w-5 h-5 text-${item.color}-400`} />
          </div>
          <div className="text-2xl font-bold text-white mb-1">{item.value}</div>
          <div className="text-xs text-white/60">{item.label}</div>
        </motion.div>
      ))}
    </div>
  );
};
