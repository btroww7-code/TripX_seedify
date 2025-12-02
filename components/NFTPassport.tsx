import React from 'react';
import { motion } from 'framer-motion';
import { Award, Star, TrendingUp, Zap } from 'lucide-react';

interface NFTPassportProps {
  tier: 'gray' | 'bronze' | 'silver' | 'gold' | 'platinum';
  level: number;
  questsCompleted: number;
  totalXP: number;
}

const tierConfig = {
  gray: { color: 'from-gray-400 to-gray-600', name: 'Explorer', icon: Award, minQuests: 0 },
  bronze: { color: 'from-amber-600 to-amber-800', name: 'Adventurer', icon: Star, minQuests: 5 },
  silver: { color: 'from-slate-300 to-slate-500', name: 'Voyager', icon: TrendingUp, minQuests: 15 },
  gold: { color: 'from-yellow-400 to-yellow-600', name: 'Master', icon: Zap, minQuests: 30 },
  platinum: { color: 'from-cyan-300 to-blue-500', name: 'Legend', icon: Star, minQuests: 50 },
};

export const NFTPassport: React.FC<NFTPassportProps> = ({ tier, level, questsCompleted, totalXP }) => {
  const config = tierConfig[tier];
  const Icon = config.icon;
  const nextTier = tier === 'gray' ? 'bronze' : tier === 'bronze' ? 'silver' : tier === 'silver' ? 'gold' : tier === 'gold' ? 'platinum' : null;
  const progress = nextTier ? (questsCompleted / tierConfig[nextTier].minQuests) * 100 : 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-3xl p-8 border border-slate-700/50 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-cyan-500/10" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-slate-400 mb-1">Travel Passport</p>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                {config.name}
              </h3>
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Icon className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Level</p>
              <p className="text-2xl font-bold text-white">{level}</p>
            </div>
            <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Quests</p>
              <p className="text-2xl font-bold text-teal-400">{questsCompleted}</p>
            </div>
            <div className="backdrop-blur-lg bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs text-slate-400 mb-1">Total XP</p>
              <p className="text-2xl font-bold text-amber-400">{totalXP.toLocaleString()}</p>
            </div>
          </div>

          {nextTier && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-400">Progress to {tierConfig[nextTier].name}</p>
                <p className="text-sm font-semibold text-slate-300">{questsCompleted}/{tierConfig[nextTier].minQuests}</p>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 shadow-lg"
                />
              </div>
            </div>
          )}

          {tier === 'platinum' && (
            <div className="mt-4 text-center">
              <motion.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-sm font-semibold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent"
              >
                Maximum Tier Achieved!
              </motion.p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
