import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Target, Award, Zap, ArrowRight, Sparkles, Coins, Trophy, Eye, EyeOff } from 'lucide-react';
import { glassEffects } from '../../../styles/glassEffects';
import { useWalletAuth } from '../../../hooks/useWalletAuth';
import { useEmailAuth } from '../../../hooks/useEmailAuth';
import { getUser } from '../../../services/userService';
// Balance is now loaded from useWalletAuth hook
// ClaimTokensButton removed
import { TokenTransactionHistory } from '../../TokenTransactionHistory';
import { NFTPassportCard } from '../../NFTPassportCard';
import { AddTPXToMetaMask } from '../../AddTPXToMetaMask';
import { AddNFTToWallet } from '../../AddNFTToWallet';
import { QuestDetailsModal } from '../../QuestDetailsModal';
import { QuestMap } from '../../QuestMap';
import { getGlobalQuests, getTripQuests } from '../../../services/questService';
import { supabase } from '../../../lib/supabase';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user: walletUser, address, isConnected, tpxBalance: walletTPX } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  const tpxBalance = walletTPX || 0; // Use balance from hook instead of local state

  const [quests, setQuests] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ xp: 0, level: 1, questsCompleted: 0, tokens: 0, totalTokensEarned: 0 });
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [questMapRef, setQuestMapRef] = useState<any>(null);
  const [questToZoom, setQuestToZoom] = useState<any>(null);

  useEffect(() => {
    loadQuests(); // Always load quests (global quests are visible to everyone)
    if (user) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Silently fail if geolocation is denied
        }
      );
    }

    // Listen for quest map show event from other pages
    const handleShowQuestOnMap = (event: CustomEvent) => {
      const quest = event.detail;
      setShowMap(true);
      setQuestToZoom(quest);
    };

    window.addEventListener('showQuestOnMap' as any, handleShowQuestOnMap as EventListener);
    return () => {
      window.removeEventListener('showQuestOnMap' as any, handleShowQuestOnMap as EventListener);
    };
  }, [setShowMap, setQuestToZoom]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const userData = await getUser(user.id);
      if (userData) {
        // CRITICAL: Parse total_tokens_earned as it may be string in database
        const totalTokensEarned = typeof userData.total_tokens_earned === 'string' 
          ? parseFloat(userData.total_tokens_earned) || 0
          : (userData.total_tokens_earned || 0);
        
        setUserStats({
          xp: userData.total_xp || 0,
          level: userData.level || 1,
          questsCompleted: userData.quests_completed || 0,
          tokens: tpxBalance || 0, // Use balance from hook
          totalTokensEarned: totalTokensEarned,
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update stats when balance changes
  useEffect(() => {
    if (user) {
      setUserStats(prev => ({
        ...prev,
        tokens: tpxBalance || 0,
      }));
    }
  }, [tpxBalance, user]);

  const loadQuests = async () => {
    try {
      // Load global permanent quests
      const globalQuests = await getGlobalQuests();
      
      // Load user's trip-specific quests if logged in
      let tripQuests: any[] = [];
      if (user) {
        tripQuests = await getTripQuests(user.id);
      }
      
      // Combine and deduplicate
      let allQuests = [...globalQuests, ...tripQuests];
      
      // CRITICAL: Filter out quests that user has already completed/verified
      if (user) {
        const { data: userQuests, error: userQuestsError } = await supabase
          .from('user_quests')
          .select('quest_id, status')
          .eq('user_id', user.id)
          .in('status', ['completed', 'verified']);
        
        if (!userQuestsError && userQuests && userQuests.length > 0) {
          const completedQuestIds = new Set(userQuests.map((uq: any) => uq.quest_id));
          allQuests = allQuests.filter((quest: any) => !completedQuestIds.has(quest.id));
          console.log('[Dashboard] Filtered out', completedQuestIds.size, 'already completed quests');
        }
      }
      
      setQuests(allQuests);
    } catch (error) {
      console.error('Error loading quests:', error);
      setQuests([]);
    }
  };

  // handleClaimSuccess removed - ClaimTokensButton removed

  const stats = [
    { label: 'Quests Completed', value: userStats.questsCompleted.toString(), icon: Trophy, color: 'cyan' },
    { label: 'TPX Earned', value: Number(userStats.totalTokensEarned).toFixed(0), icon: Coins, color: 'purple' },
    { label: 'Wallet Balance', value: tpxBalance.toFixed(2), icon: Sparkles, color: 'green' },
    { label: 'Level', value: userStats.level.toString(), icon: Award, color: 'amber' },
  ];

  const startQuest = async (questId: string) => {
    alert('Quest feature coming soon!');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20, filter: "blur(20px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
        style={glassEffects.inlineStyles.glass}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"
        />
        <div className="relative z-10">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-lg bg-white/[0.05] border border-white/[0.10] mb-6">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Welcome to TripX</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">Explore. Complete. Earn.</h1>
          <p className="text-white/70 text-lg mb-8 max-w-2xl">Discover quests at real locations worldwide. Earn TPX tokens. Level up your NFT Passport.</p>
          <div className="flex flex-wrap gap-4">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMap(!showMap)}
              className="group relative overflow-hidden px-8 py-4 rounded-xl backdrop-blur-xl bg-white/[0.08] text-white border border-white/[0.15] font-semibold hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-[0_8px_32px_rgba(255,255,255,0.08)] transition-all duration-300 shadow-[0_4px_16px_rgba(255,255,255,0.04)]"
            >
              <motion.div
                animate={{
                  opacity: [0.1, 0.2, 0.1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-gradient-to-r from-white/[0.05] via-white/[0.10] to-white/[0.05] rounded-xl blur-xl pointer-events-none"
              />
              <span className="relative flex items-center gap-2" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {showMap ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                {showMap ? 'Hide Map' : 'View Quest Map'}
              </span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onNavigate('create')} className="group relative overflow-hidden px-8 py-4 rounded-xl backdrop-blur-lg bg-white/[0.05] text-white border border-white/[0.10] font-semibold hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300">
              <span className="relative flex items-center gap-2">Create Custom Trip<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" /></span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group relative rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] p-6 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:bg-white/[0.05] hover:border-white/[0.12] hover:shadow-[0_12px_48px_rgba(0,0,0,0.16)] transition-all duration-300"
              style={glassEffects.inlineStyles.glass}
            >
              <motion.div
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
              />
              <div className="relative z-10">
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                  className={`inline-flex p-3 rounded-xl mb-4 shadow-lg ${
                    stat.color === 'cyan' ? 'bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border border-cyan-500/50' :
                    stat.color === 'purple' ? 'bg-gradient-to-br from-purple-500/30 to-purple-600/30 border border-purple-500/50' :
                    stat.color === 'green' ? 'bg-gradient-to-br from-green-500/30 to-green-600/30 border border-green-500/50' :
                    'bg-gradient-to-br from-amber-500/30 to-amber-600/30 border border-amber-500/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${
                    stat.color === 'cyan' ? 'text-cyan-400' :
                    stat.color === 'purple' ? 'text-purple-400' :
                    stat.color === 'green' ? 'text-green-400' :
                    'text-amber-400'
                  }`} />
                </motion.div>
                <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
                <p className="text-white/60 text-sm group-hover:text-white/80 transition-colors">{stat.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl overflow-hidden backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            style={glassEffects.inlineStyles.glass}
          >
            {quests.length > 0 ? (
              <QuestMap
                quests={quests}
                userLocation={userLocation}
                onQuestSelect={(quest) => {
                  setSelectedQuest(quest);
                  // Close any existing zoom animation
                  setQuestToZoom(null);
                }}
                height="600px"
                questToZoom={questToZoom}
                onZoomComplete={() => {
                  setQuestToZoom(null);
                }}
                onAcceptQuest={(quest) => {
                  loadQuests(); // Reload quests after accepting
                  if (user) {
                    loadUserData(); // Update user stats
                  }
                }}
              />
            ) : (
              <div className="h-[600px] flex items-center justify-center bg-slate-800/50">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No quests available</p>
                  <p className="text-slate-500 text-sm mt-2">Create a trip to generate quests or wait for global quests to load</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show for logged in users (wallet or email) */}
      {(user || address) && (
        <>
          {user && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {/* ClaimTokensButton removed */}
                  {isConnected && address && (
                    <div className="flex flex-col items-center gap-3">
                      <AddTPXToMetaMask address={address} />
                      <AddNFTToWallet />
                    </div>
                  )}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowHistory(!showHistory)}
                className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 p-6 text-left hover:bg-white/8 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Transaction History</h3>
                    <p className="text-white/60 text-sm">View all your token transactions</p>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-white/60 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                </div>
              </motion.button>
            </div>
          )}

          {/* NFT Passport Card - show for wallet users (even if user is still loading) */}
          {address && (
            <div className="mt-6">
              <NFTPassportCard />
            </div>
          )}
        </>
      )}

      {showHistory && user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <TokenTransactionHistory />
        </motion.div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Available Quests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest, index) => {
            const isSponsored = quest.quest_type === 'sponsored';
            const isHidden = quest.quest_type === 'hidden_gem';
            return (
              <motion.div
                key={quest.id}
                data-quest-id={quest.id}
                initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -12, scale: 1.03 }}
                className="relative group h-full"
              >
                <div className={`relative backdrop-blur-xl bg-white/[0.03] rounded-3xl p-6 border-2 ${
                  isSponsored ? 'border-amber-500/50 shadow-2xl shadow-amber-500/20' :
                  isHidden ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20' :
                  'border-white/10 shadow-xl shadow-white/5'
                } overflow-hidden h-full transition-all duration-500 hover:shadow-3xl ${
                  isSponsored ? 'hover:shadow-amber-500/30' :
                  isHidden ? 'hover:shadow-purple-500/30' :
                  'hover:shadow-white/10'
                }`}>
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.2, 0.4, 0.2],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${
                      isSponsored ? 'bg-gradient-to-br from-amber-400/30 to-transparent' :
                      isHidden ? 'bg-gradient-to-br from-purple-400/30 to-transparent' :
                      'bg-gradient-to-br from-white/10 to-transparent'
                    }`}
                  />
                  {isSponsored && (
                    <motion.div
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent"
                    />
                  )}
                  {isHidden && (
                    <motion.div
                      animate={{ opacity: [0.1, 0.3, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent"
                    />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        {isSponsored && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 mb-2 w-fit">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-semibold text-amber-400">Sponsored</span>
                          </div>
                        )}
                        {isHidden && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 mb-2 w-fit">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span className="text-xs font-semibold text-purple-400">Hidden Gem</span>
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2">{quest.title}</h3>
                        <p className="text-sm text-white/60 mb-3">{quest.description}</p>
                        {quest.sponsor_name && (
                          <p className="text-xs text-amber-400 mb-2">by {quest.sponsor_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{quest.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-semibold text-white">{quest.reward_tokens} TPX</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                          <Zap className="w-4 h-4 text-white" />
                          <span className="text-sm font-semibold text-white">{quest.reward_xp} XP</span>
                        </div>
                      </div>
                    </div>

                    <motion.button
                      ref={(el) => {
                        if (el && selectedQuest?.id === quest.id) {
                          (el as any).questButtonRef = el;
                        }
                      }}
                      data-quest-button-id={quest.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedQuest(quest);
                      }}
                      className={`w-full mt-4 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                        isSponsored
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/50'
                          : isHidden
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                          : 'bg-white text-black shadow-lg'
                      }`}
                    >
                      View Details
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quest Details Modal */}
      {selectedQuest && (
        <QuestDetailsModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onShowOnMap={(quest) => {
            setShowMap(true);
            setQuestToZoom(quest);
          }}
          onAcceptQuest={(quest) => {
            loadQuests(); // Reload quests after accepting
            if (user) {
              loadUserData(); // Update user stats
            }
          }}
        />
      )}
    </div>
  );
};
