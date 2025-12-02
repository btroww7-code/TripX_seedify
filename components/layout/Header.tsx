import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Bell, Award, X, Mail, LogOut } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { useEmailAuth } from '../../hooks/useEmailAuth';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { AuthModal } from '../AuthModal';
import { Shield } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
}

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate }) => {
  const walletAuth = useWalletAuth();
  const { user: walletUser, tpxBalance: walletTPX, isConnected, address, signOut: signOutWallet } = walletAuth;
  const { user: emailUser, tpxBalance: emailTPX, signOut: signOutEmail, isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const { isAdmin } = useAdminAuth();
  const { disconnect } = useDisconnect();
  const user = walletUser || emailUser;
  const tpxBalance = walletTPX || emailTPX || 0;

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      title: 'Witaj w TripX!',
      message: 'Zacznij tworzyć swoje podróże i zdobywaj tokeny TPX.',
      type: 'info',
      timestamp: new Date(),
    },
  ]);

  const stats = {
    tokens: tpxBalance,
    xp: user?.total_xp || 0,
    level: user?.level || 1,
  };

  useEffect(() => {
    if (headerRef.current) {
      headerRef.current.style.setProperty('background-color', 'rgba(0, 0, 0, 0.03)', 'important');
      headerRef.current.style.setProperty('backdrop-filter', 'blur(2px)', 'important');
      headerRef.current.style.setProperty('-webkit-backdrop-filter', 'blur(2px)', 'important');
      headerRef.current.style.setProperty('border-radius', '0', 'important');
    }
  }, []);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 backdrop-blur-[2px] border-b-0 relative overflow-visible shadow-none"
    >
      <motion.div
        animate={{
          opacity: [0.05, 0.15, 0.05],
          x: [-200, 200, -200]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-gradient-to-r from-white/[0.08] via-transparent to-white/[0.08] pointer-events-none"
      />
      <div className="relative px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden md:block"
              >
                <div
                  className="backdrop-blur-xl rounded-2xl px-6 py-3 border border-white/10 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Coins className="w-6 h-6 text-black" />
                      </div>
                      <div className="absolute -inset-1 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl blur opacity-20" />
                    </div>
                    <div>
                      <p className="text-xs text-white/90 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>TPX Balance</p>
                      <p className="text-xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{stats.tokens.toFixed(0)}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-white to-white/80 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-6 h-6 text-black" />
                      </div>
                      <div className="absolute -inset-1 bg-white rounded-xl blur opacity-20" />
                    </div>
                    <div>
                      <p className="text-xs text-white/90 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Total XP</p>
                      <p className="text-xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{stats.xp.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center shadow-lg border border-white/20">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-white/90 font-medium" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>Level</p>
                      <p className="text-xl font-bold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>{stats.level}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05, rotate: [0, -10, 10, 0] }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 rounded-xl backdrop-blur-xl border border-white/10 transition-all duration-300"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                }}
              >
                <Bell className="w-5 h-5 text-white" />
                {notifications.length > 0 && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"
                  />
                )}
              </motion.button>
              
              {/* Notifications dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-2xl backdrop-blur-xl border border-white/[0.08] shadow-2xl z-[100] overflow-hidden"
                    style={{
                      backdropFilter: 'blur(12px)',
                      backgroundColor: 'rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Powiadomienia</h3>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1 rounded-lg hover:bg-slate-800/50 transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification, idx) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-4 border-b border-white/[0.03] hover:bg-white/[0.05] transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${
                                notification.type === 'success' ? 'bg-green-400' :
                                notification.type === 'warning' ? 'bg-yellow-400' :
                                notification.type === 'error' ? 'bg-red-400' :
                                'bg-cyan-400'
                              }`} />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white mb-1">{notification.title}</p>
                                <p className="text-xs text-slate-400">{notification.message}</p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-slate-400 text-sm">Brak powiadomień</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isAdmin && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('admin');
                  }
                }}
                className="px-3 py-2 rounded-xl backdrop-blur-xl border border-cyan-500/30 text-cyan-400 text-sm font-medium cursor-pointer transition-all duration-300 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                }}
                title="Admin Panel"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </motion.button>
            )}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={openConnectModal}
                            className="px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 text-white text-sm font-medium cursor-pointer transition-all duration-300"
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              backdropFilter: 'blur(20px) saturate(180%)',
                              WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                            }}
                          >
                            Connect Wallet
                          </motion.button>
                        );
                      }

                      return (
                        <div className="flex gap-2 items-center">
                          {!isConnected && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setShowAuthModal(true)}
                              className="px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 text-white text-sm font-medium cursor-pointer transition-all duration-300 flex items-center gap-2"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                              }}
                            >
                              <Mail className="w-4 h-4" />
                              Sign In
                            </motion.button>
                          )}
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={openAccountModal}
                              className="px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 text-white text-sm font-medium cursor-pointer transition-all duration-300 flex items-center gap-2"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                              }}
                            >
                              {account.displayName}
                              {account.displayBalance ? ` (${account.displayBalance})` : ''}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={async () => {
                                console.log('[Header] LOGOUT CLICKED');
                                
                                // Clear wagmi cache from localStorage
                                Object.keys(localStorage).forEach(key => {
                                  if (key.startsWith('wagmi.') || key.startsWith('wc@') || key.startsWith('walletconnect')) {
                                    localStorage.removeItem(key);
                                  }
                                });
                                
                                // Clear session storage
                                sessionStorage.clear();
                                
                                // Clear app state
                                if (signOutWallet) {
                                  await signOutWallet();
                                }
                                
                                // Disconnect wallet
                                disconnect();
                                
                                console.log('[Header] LOGOUT COMPLETE - state cleared, wallet disconnected');
                                
                                // Force page reload after a short delay to ensure all state is cleared
                                setTimeout(() => {
                                  window.location.reload();
                                }, 300);
                              }}
                              className="p-2 rounded-xl backdrop-blur-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all duration-300 flex items-center justify-center"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                backdropFilter: 'blur(20px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                              }}
                              title="Disconnect Wallet"
                            >
                              <LogOut className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
            {!isConnected && !user && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 text-white text-sm font-medium cursor-pointer transition-all duration-300 flex items-center gap-2"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                }}
              >
                <Mail className="w-4 h-4" />
                Sign In with Email
              </motion.button>
            )}
            {isEmailAuthenticated && !isConnected && (
              <div className="flex items-center gap-2">
                <motion.div
                  className="px-4 py-2 rounded-xl backdrop-blur-xl border border-white/10 text-white text-sm font-medium flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                  }}
                >
                  <Mail className="w-4 h-4" />
                  {emailUser?.email || 'Signed In'}
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    console.log('[Header] EMAIL LOGOUT CLICKED');
                    signOutEmail();
                  }}
                  className="p-2 rounded-xl backdrop-blur-xl border border-red-500/30 text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all duration-300 flex items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)'
                  }}
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </motion.header>
  );
};
