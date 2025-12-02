import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';

type PassportTier = 'bronze' | 'silver' | 'gold' | 'platinum';

const getPassportTier = (level: number): PassportTier => {
  if (level >= 50) return 'platinum';
  if (level >= 25) return 'gold';
  if (level >= 10) return 'silver';
  return 'bronze';
};

interface LevelBadgeProps {
  level: number;
  totalXP: number;
  showProgress?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, totalXP, showProgress = true }) => {
  const tier = getPassportTier(level);
  
  // IMPORTANT: level = floor(sqrt(totalXP / 100)) + 1
  // First, calculate what level SHOULD be based on totalXP
  const calculatedLevel = Math.floor(Math.sqrt(totalXP / 100)) + 1;
  
  // Use the calculated level (in case DB is out of sync)
  const actualLevel = calculatedLevel;
  
  // Calculate XP thresholds for THIS level
  // Level N starts at: (N-1)^2 * 100
  // Level N+1 starts at: N^2 * 100
  const currentLevelMinXP = Math.pow(actualLevel - 1, 2) * 100;
  const nextLevelMinXP = Math.pow(actualLevel, 2) * 100;
  
  // Calculate progress within current level
  const xpInCurrentLevel = totalXP - currentLevelMinXP;
  const xpNeededForNextLevel = nextLevelMinXP - currentLevelMinXP;
  const progress = Math.max(0, Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  const tierColors = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-cyan-300 to-cyan-500',
  };

  const tierGlowColors = {
    bronze: 'rgba(217, 119, 6, 0.4)',
    silver: 'rgba(148, 163, 184, 0.4)',
    gold: 'rgba(250, 204, 21, 0.5)',
    platinum: 'rgba(103, 232, 249, 0.5)',
  };

  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
            className={`w-16 h-16 bg-gradient-to-br ${tierColors[tier]} rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/30 relative`}
          >
            <span className="text-3xl">{tierIcons[tier]}</span>
            <div className="absolute -inset-1 bg-gradient-to-br ${tierColors[tier]} rounded-2xl blur-lg opacity-50" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-5 h-5 text-white/80" />
              <span className="text-2xl font-bold text-white">Level {actualLevel}</span>
            </div>
            <span className="text-sm text-white/60 capitalize font-medium">{tier} Tier</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/50 mb-1">Total XP</div>
          <div className="text-2xl font-bold text-white">{totalXP.toLocaleString()}</div>
        </div>
      </div>

      {showProgress && (
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-white/70">
              <span className="font-semibold text-white">{totalXP.toLocaleString()}</span>
              <span className="text-white/50"> / {nextLevelMinXP.toLocaleString()} XP</span>
            </div>
            <div className="text-sm text-white/70">
              <span className="font-semibold text-cyan-400">{Math.round(progress)}%</span> to Level {actualLevel + 1}
            </div>
          </div>
          
          <div className="relative">
            <div className="w-full h-4 bg-black/30 rounded-full overflow-hidden border border-white/10 relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.34, 1.56, 0.64, 1],
                  delay: 0.2
                }}
                className={`h-full bg-gradient-to-r ${tierColors[tier]} relative overflow-hidden`}
                style={{
                  boxShadow: `0 0 20px ${tierGlowColors[tier]}`
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    repeatDelay: 1
                  }}
                />
              </motion.div>
            </div>
          </div>

          <div className="flex justify-between text-xs text-white/50">
            <div>
              <span className="text-white/70">Level {actualLevel}:</span> {currentLevelMinXP.toLocaleString()} XP
            </div>
            <div>
              <span className="text-white/70">Level {actualLevel + 1}:</span> {nextLevelMinXP.toLocaleString()} XP
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

