import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Coins, Zap, Trophy, Navigation, Sparkles, ExternalLink, Clock, DollarSign, CheckCircle2, Eye } from 'lucide-react';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { useEmailAuth } from '../hooks/useEmailAuth';
import { startQuest as startQuestService } from '../services/questService';

interface Quest {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  difficulty: number;
  reward_tokens: number;
  reward_xp: number;
  quest_type?: string;
  nft_reward?: boolean;
  is_permanent?: boolean;
  category?: string;
  place_id?: string;
  place_name?: string;
  place_address?: string;
  place_website?: string;
  place_phone?: string;
  place_opening_hours?: any;
  place_price_level?: number;
}

interface QuestDetailsModalProps {
  quest: Quest | null;
  onClose: () => void;
  onShowOnMap?: (quest: Quest) => void;
  onAcceptQuest?: (quest: Quest) => void;
}

export const QuestDetailsModal: React.FC<QuestDetailsModalProps> = ({ quest, onClose, onShowOnMap, onAcceptQuest }) => {
  const { user: walletUser } = useWalletAuth();
  const { user: emailUser } = useEmailAuth();
  const user = walletUser || emailUser;
  const [accepting, setAccepting] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !accepting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, accepting]);

  const handleAcceptQuest = async () => {
    if (!user || !quest) {
      setToastMessage({ 
        type: 'error', 
        message: 'Please connect your wallet or sign in to accept quests' 
      });
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    console.log('[QuestDetailsModal] Accepting quest:', { 
      userId: user.id, 
      questId: quest.id,
      questTitle: quest.title 
    });

    setAccepting(true);
    try {
      await startQuestService(user.id, quest.id);
      console.log('[QuestDetailsModal] Quest accepted successfully!');
      if (onAcceptQuest) {
        onAcceptQuest(quest);
      }
      setToastMessage({ 
        type: 'success', 
        message: '✅ Quest accepted! Check "My Quests" to track your progress.' 
      });
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('[QuestDetailsModal] Error accepting quest:', error);
      setToastMessage({ 
        type: 'error', 
        message: error.message || 'Failed to accept quest. Please try again.' 
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setAccepting(false);
    }
  };

  const handleShowOnMap = () => {
    if (quest && onShowOnMap) {
      onClose();
      setTimeout(() => {
        onShowOnMap(quest);
        // Scroll to top to show map
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 200);
    }
  };

  const handleShowTransit = () => {
    if (quest) {
      window.dispatchEvent(new CustomEvent('navigateToTransit', {
        detail: {
          to: quest.location,
          toCoords: { lat: quest.latitude, lng: quest.longitude }
        }
      }));
      onClose();
    }
  };

  const handleStreetView = () => {
    if (quest && quest.latitude && quest.longitude) {
      const streetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${quest.latitude},${quest.longitude}`;
      window.open(streetViewUrl, '_blank');
    }
  };

  if (!quest) return null;

  const difficultyColors = [
    'from-green-500/30 to-emerald-500/30 border-green-400/40 text-green-300',
    'from-blue-500/30 to-cyan-500/30 border-blue-400/40 text-blue-300',
    'from-yellow-500/30 to-amber-500/30 border-yellow-400/40 text-yellow-300',
    'from-orange-500/30 to-red-500/30 border-orange-400/40 text-orange-300',
    'from-red-500/30 to-pink-500/30 border-red-400/40 text-red-300',
  ];

  const difficultyLabels = ['Easy', 'Medium', 'Hard', 'Very Hard', 'Extreme'];
  const priceLevels = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'];

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm" 
      onClick={onClose}
      style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '2rem', paddingBottom: '2rem' }}
    >
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 rounded-3xl border border-white/30 shadow-2xl mx-4"
        style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', marginTop: `${window.scrollY}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 flex items-center justify-center text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="pb-3 border-b border-white/20 mb-4">
            <h2 className="text-2xl font-bold text-white mb-3 pr-12">
              {quest.title}
            </h2>
            
            {quest.nft_reward && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/40 to-pink-500/40 border border-purple-400/50 mb-2">
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span className="text-sm font-bold text-purple-200">NFT Reward Available</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-white/70">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">{quest.location}</span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white/10 rounded-xl p-4 border border-white/20 mb-4">
            <p className="text-white/80 leading-relaxed text-sm">{quest.description}</p>
          </div>

          {/* Rewards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-400/30">
              <div className="flex flex-col items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-400" />
                <p className="text-sm font-bold text-white">{quest.reward_tokens}</p>
                <p className="text-xs text-amber-200/80">TPX</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-400/30">
              <div className="flex flex-col items-center gap-1.5">
                <Zap className="w-5 h-5 text-cyan-400" />
                <p className="text-sm font-bold text-white">{quest.reward_xp}</p>
                <p className="text-xs text-cyan-200/80">XP</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center bg-gradient-to-br ${difficultyColors[Math.min(quest.difficulty - 1, 4)]}`}>
              <Trophy className="w-5 h-5" />
              <p className="text-xs font-semibold mt-1.5">Level {quest.difficulty}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-3 border-t border-white/20">
            {onShowOnMap && (
              <button
                onClick={handleShowOnMap}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/40 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Navigation className="w-4 h-4" />
                <span>View on Map</span>
              </button>
            )}

            {quest.latitude && quest.longitude && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShowTransit}
                  className="py-3 px-3 rounded-xl font-semibold text-white bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 hover:border-green-400/40 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Route</span>
                </button>
                <button
                  onClick={handleStreetView}
                  className="py-3 px-3 rounded-xl font-semibold text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 hover:border-purple-400/40 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span>Street View</span>
                </button>
              </div>
            )}

            <button
              onClick={handleAcceptQuest}
              disabled={accepting}
              className="w-full py-4 px-4 rounded-xl font-bold text-lg text-white bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 hover:from-emerald-500 hover:to-cyan-500 border border-emerald-400/50 hover:border-emerald-400/70 transition-all flex items-center justify-center gap-2 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <Navigation className="w-5 h-5 animate-spin" />
                  <span>Accepting Quest...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{user ? 'Accept Quest' : 'Sign In to Accept'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className={`absolute bottom-4 left-4 right-4 p-4 rounded-xl backdrop-blur-2xl border shadow-2xl ${
            toastMessage.type === 'success'
              ? 'bg-gradient-to-r from-emerald-500/90 to-green-500/90 border-emerald-400/50'
              : 'bg-gradient-to-r from-red-500/90 to-rose-500/90 border-red-400/50'
          }`}>
            <p className="text-white font-semibold text-sm text-center">
              {toastMessage.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
