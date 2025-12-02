import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Zap, TrendingUp, Award, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { getLeaderboard, getUserRank, getLeaderboardCount, type LeaderboardPeriod } from '../../../services/leaderboardService';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  total_xp: number;
  quests_completed: number;
  tokens_earned: number;
  rank?: number;
  users?: {
    username?: string;
    wallet_address?: string;
    level?: number;
    total_xp?: number;
    quests_completed?: number;
    total_tokens_earned?: number;
  };
}

// Helper to get fresh XP value (prefer users table data)
const getXp = (entry: LeaderboardEntry): number => {
  return Number(entry.users?.total_xp ?? entry.total_xp ?? 0);
};

// Helper to get fresh quests count
const getQuestsCompleted = (entry: LeaderboardEntry): number => {
  return Number(entry.users?.quests_completed ?? entry.quests_completed ?? 0);
};

// Helper to get fresh tokens earned
const getTokensEarned = (entry: LeaderboardEntry): number => {
  return Number(entry.users?.total_tokens_earned ?? entry.tokens_earned ?? 0);
};

export const Leaderboard: React.FC = () => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const entriesPerPage = 50;

  // Define loadLeaderboard BEFORE using it in useEffect
  const loadLeaderboard = React.useCallback(async () => {
    setLoading(true);
    try {
      console.log('[Leaderboard] Loading leaderboard for period:', period, 'page:', currentPage);
      
      // Always get user rank first (even if not on current page)
      if (user?.id) {
        console.log('[Leaderboard] Fetching user rank for user:', user.id);
        const rank = await getUserRank(user.id, period);
        console.log('[Leaderboard] User rank result:', rank);
        setUserRank(rank);
      } else {
        console.log('[Leaderboard] No user logged in');
        setUserRank(null);
      }
      
      // Get total count
      const count = await getLeaderboardCount(period);
      console.log('[Leaderboard] Total count:', count);
      setTotalCount(count);
      
      // Calculate offset
      const offset = (currentPage - 1) * entriesPerPage;
      console.log('[Leaderboard] Fetching entries with offset:', offset, 'limit:', entriesPerPage);
      
      // Load leaderboard entries for current page
      const data = await getLeaderboard(period, entriesPerPage, offset);
      console.log('[Leaderboard] Received data:', data?.length || 0, 'entries (page', currentPage, 'of', Math.ceil(count / entriesPerPage), ')');
      
      if (data && data.length > 0) {
        console.log('[Leaderboard] Sample entry:', {
          rank: data[0].rank,
          user_id: data[0].user_id,
          total_xp: data[0].total_xp
        });
      }
      
      setLeaderboard(data || []);
    } catch (error) {
      console.error('[Leaderboard] Error loading leaderboard:', error);
      setLeaderboard([]);
      setUserRank(null);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [period, currentPage, user?.id]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Auto-refresh leaderboard every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeaderboard();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loadLeaderboard]);

  // Listen for user data updates (XP, level changes after quest completion)
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('[Leaderboard] User data update event received, refreshing leaderboard...');
      // Small delay to ensure backend has updated the leaderboard
      setTimeout(() => {
        loadLeaderboard();
      }, 500);
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, [loadLeaderboard]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-amber-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-300" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-400" />;
    return null;
  };

  const getUsername = (entry: LeaderboardEntry) => {
    if (entry.users?.username) return entry.users.username;
    if (entry.users?.wallet_address) {
      return `${entry.users.wallet_address.slice(0, 6)}...${entry.users.wallet_address.slice(-4)}`;
    }
    return 'Anonymous';
  };

  const isCurrentUser = (entry: LeaderboardEntry) => {
    if (!user) return false;
    return entry.user_id === user.id;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/50">
              <Trophy className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
              <p className="text-slate-400">Top travelers • Real-time rankings</p>
            </div>
          </div>
          <motion.button
            onClick={() => loadLeaderboard()}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Period Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(['all-time', 'monthly', 'weekly'] as LeaderboardPeriod[]).map((p) => (
          <motion.button
            key={p}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setPeriod(p);
              setCurrentPage(1); // Reset to first page when changing period
            }}
            className={`px-4 sm:px-6 py-2 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
              period === p
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* User Rank Display - Always show if user is logged in */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl border border-amber-500/30"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
              {userRank !== null && userRank !== undefined ? (
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-white text-sm sm:text-base whitespace-nowrap">
                    Your rank: <span className="font-bold text-amber-400 text-lg sm:text-xl">#{userRank}</span>
                  </span>
                  {totalCount > 0 && (
                    <span className="text-white/60 text-xs sm:text-sm whitespace-nowrap">
                      (out of {totalCount} {totalCount === 1 ? 'player' : 'players'})
                    </span>
                  )}
                </div>
              ) : loading ? (
                <span className="text-white/60 text-sm sm:text-base">
                  Loading your rank...
                </span>
              ) : (
                <span className="text-white/60 text-sm sm:text-base">
                  Your rank will appear here once you complete your first quest
                </span>
              )}
            </div>
            {userRank !== null && userRank !== undefined && (
              <div className="text-xs sm:text-sm text-white/40 whitespace-nowrap">
                {userRank === 1 && '🥇 Champion!'}
                {userRank === 2 && '🥈 Runner-up!'}
                {userRank === 3 && '🥉 Top 3!'}
                {userRank > 3 && userRank <= 10 && '⭐ Top 10!'}
                {userRank > 10 && userRank <= 50 && '🔥 Top 50!'}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Leaderboard Table */}
      <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-4 text-white/60">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No entries yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-white/60">Rank</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-sm font-semibold text-white/60">User</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-white/60">XP</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-white/60">Quests</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-white/60">TPX</th>
                    <th className="px-4 lg:px-6 py-4 text-right text-sm font-semibold text-white/60">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => {
                    const rank = entry.rank || (currentPage - 1) * entriesPerPage + index + 1;
                    return (
                      <motion.tr
                        key={entry.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                          isCurrentUser(entry) ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2 lg:gap-3">
                            {getRankIcon(rank)}
                            <span className="font-bold text-white text-sm lg:text-base">{rank}</span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-2 border-slate-600/50 flex-shrink-0">
                              <span className="text-xs lg:text-sm font-bold text-white">
                                {getUsername(entry).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-white text-sm lg:text-base truncate max-w-[150px] lg:max-w-none">{getUsername(entry)}</span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <TrendingUp className="w-3 h-3 lg:w-4 lg:h-4 text-blue-400" />
                            <span className="font-semibold text-white text-sm lg:text-base">
                              {getXp(entry).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right">
                          <span className="text-white text-sm lg:text-base">{getQuestsCompleted(entry)}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Zap className="w-3 h-3 lg:w-4 lg:h-4 text-amber-400" />
                            <span className="font-bold text-amber-400 text-sm lg:text-base">
                              {getTokensEarned(entry).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right">
                          <span className="px-2 lg:px-3 py-1 rounded-full bg-white/10 text-white text-xs lg:text-sm font-medium">
                            {entry.users?.level || 1}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
              {leaderboard.map((entry, index) => {
                const rank = entry.rank || (currentPage - 1) * entriesPerPage + index + 1;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-xl backdrop-blur-xl bg-white/5 border border-white/10 p-4 ${
                      isCurrentUser(entry) ? 'bg-amber-500/10 border-amber-500/30' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getRankIcon(rank)}
                        <span className="font-bold text-white text-lg">#{rank}</span>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-2 border-slate-600/50">
                          <span className="text-sm font-bold text-white">
                            {getUsername(entry).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-white">{getUsername(entry)}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium">
                        Level {entry.users?.level || 1}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                        </div>
                        <p className="text-xs text-white/60">XP</p>
                        <p className="font-semibold text-white">
                          {getXp(entry).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Quests</p>
                        <p className="font-semibold text-white">{getQuestsCompleted(entry)}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Zap className="w-4 h-4 text-amber-400" />
                        </div>
                        <p className="text-xs text-white/60">TPX</p>
                        <p className="font-bold text-amber-400">
                          {getTokensEarned(entry).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > entriesPerPage && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Previous</span>
            </motion.button>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-white/60 text-xs sm:text-sm">
                Page <span className="font-bold text-white">{currentPage}</span> of{' '}
                <span className="font-bold text-white">{Math.ceil(totalCount / entriesPerPage)}</span>
              </span>
              <span className="text-white/40 text-xs">
                ({totalCount} total)
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / entriesPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(totalCount / entriesPerPage)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Page numbers for quick navigation */}
          {Math.ceil(totalCount / entriesPerPage) <= 10 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Array.from({ length: Math.ceil(totalCount / entriesPerPage) }, (_, i) => i + 1).map((page) => (
                <motion.button
                  key={page}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    currentPage === page
                      ? 'bg-amber-500 text-slate-900'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {page}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick jump to user's page if they're not on current page */}
      {user && userRank && (
        <div className="mt-4 text-center">
          {(() => {
            const userPage = Math.ceil(userRank / entriesPerPage);
            const isUserOnCurrentPage = leaderboard.some(entry => entry.user_id === user.id);
            
            if (!isUserOnCurrentPage && userPage !== currentPage) {
              return (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage(userPage)}
                  className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-all text-sm sm:text-base"
                >
                  Jump to your position (Rank #{userRank})
                </motion.button>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
};
