import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  Trophy,
  Star,
  Zap,
  Coins,
  Calendar,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import {
  getUserAchievements,
  type UserAchievement,
} from '../services/achievementService';

export const AchievementHistory: React.FC = () => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;

  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AchievementHistory] User changed:', user?.id);
    
    // CRITICAL: Clear achievements when user changes
    setAchievements([]);
    setLoading(true);
    
    if (user?.id) {
      console.log('[AchievementHistory] Loading achievements for user:', user.id);
      loadAchievements();
    } else {
      console.log('[AchievementHistory] No user - clearing achievements');
      setLoading(false);
    }
  }, [user?.id]);

  const loadAchievements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserAchievements(user.id);
      setAchievements(data);
    } catch (err) {
      console.error('Error loading achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'travel':
        return <Trophy className="w-5 h-5" />;
      case 'quests':
        return <Star className="w-5 h-5" />;
      case 'social':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'travel':
        return 'from-blue-500 to-cyan-500';
      case 'quests':
        return 'from-purple-500 to-pink-500';
      case 'social':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
        </div>
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-8 text-center">
        <Award className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Achievements Yet</h3>
        <p className="text-white/60 text-sm">
          Complete quests and reach milestones to unlock achievements
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Achievement History</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((userAchievement, index) => {
          const achievement = userAchievement.achievements;
          if (!achievement) return null;

          const categoryColor = getCategoryColor(achievement.category);
          const CategoryIcon = getCategoryIcon(achievement.category);

          return (
            <motion.div
              key={userAchievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4 hover:bg-white/8 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${categoryColor} flex items-center justify-center flex-shrink-0`}>
                  {CategoryIcon && <CategoryIcon className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold mb-1 truncate">
                    {achievement.title}
                  </h4>
                  {achievement.description && (
                    <p className="text-white/60 text-xs line-clamp-2">
                      {achievement.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/60 mb-3">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(userAchievement.unlocked_at)}</span>
                </div>
              </div>

              {(achievement.reward_xp || achievement.reward_tokens) && (
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  {achievement.reward_xp && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Zap className="w-3 h-3" />
                      <span className="text-xs font-semibold">{achievement.reward_xp} XP</span>
                    </div>
                  )}
                  {achievement.reward_tokens && (
                    <div className="flex items-center gap-1 text-cyan-400">
                      <Coins className="w-3 h-3" />
                      <span className="text-xs font-semibold">{achievement.reward_tokens} TPX</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

