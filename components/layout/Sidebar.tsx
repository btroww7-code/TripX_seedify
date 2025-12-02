import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Compass, Map, Trophy, Award, Sparkles, Zap, Train, Briefcase, User, Shield } from 'lucide-react';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { useEmailAuth } from '../../hooks/useEmailAuth';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const allMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Compass, requiresAuth: false },
  { id: 'transit', label: 'Transit', icon: Train, requiresAuth: false },
  { id: 'create', label: 'Create Trip', icon: Sparkles, requiresAuth: false },
  { id: 'trips', label: 'My Trips', icon: Briefcase, requiresAuth: true },
  { id: 'quests', label: 'My Quests', icon: Map, requiresAuth: true },
  { id: 'profile', label: 'Profile', icon: User, requiresAuth: true },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, requiresAuth: false },
  { id: 'achievements', label: 'Achievements', icon: Award, requiresAuth: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { isConnected: isWalletConnected } = useWalletAuth();
  const { isAuthenticated: isEmailAuthenticated } = useEmailAuth();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const isLoggedIn = isWalletConnected || isEmailAuthenticated;
  
  // Filter menu items based on authentication
  let menuItems = allMenuItems.filter(item => !item.requiresAuth || isLoggedIn);
  
  // Add Admin Panel ONLY if user is admin (wait for check to complete)
  if (!adminLoading && isAdmin) {
    menuItems = [
      ...menuItems,
      { id: 'admin', label: 'Admin Panel', icon: Shield, requiresAuth: true }
    ];
  }
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sidebarRef.current) {
      sidebarRef.current.style.setProperty('background-color', 'rgba(0, 0, 0, 0.03)', 'important');
      sidebarRef.current.style.setProperty('backdrop-filter', 'blur(2px)', 'important');
      sidebarRef.current.style.setProperty('-webkit-backdrop-filter', 'blur(2px)', 'important');
      sidebarRef.current.style.setProperty('border-radius', '0', 'important');
    }
    if (mobileMenuRef.current) {
      mobileMenuRef.current.style.setProperty('background-color', 'rgba(0, 0, 0, 0.03)', 'important');
      mobileMenuRef.current.style.setProperty('backdrop-filter', 'blur(2px)', 'important');
      mobileMenuRef.current.style.setProperty('-webkit-backdrop-filter', 'blur(2px)', 'important');
      mobileMenuRef.current.style.setProperty('border-radius', '0', 'important');
    }
  }, []);

  return (
    <>
      <motion.aside
        ref={sidebarRef}
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed left-0 top-0 h-screen w-64 backdrop-blur-[2px] border-r-0 hidden lg:flex flex-col z-40 shadow-none overflow-hidden"
      >
        <motion.div
          animate={{
            opacity: [0.05, 0.15, 0.05],
            y: [-200, 200, -200]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-white/[0.04] pointer-events-none"
        />
        <div className="relative p-6 border-b-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <div className="relative group">
              <motion.div
                whileHover={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: 1.1,
                  boxShadow: "0 0 40px rgba(255, 255, 255, 0.4)"
                }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  rotate: { duration: 0.5, ease: "easeInOut" },
                  scale: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                  boxShadow: { duration: 0.3 }
                }}
                className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-[0_8px_32px_rgba(255,255,255,0.15)] cursor-pointer relative z-10"
              >
                <Zap className="w-7 h-7 text-black" fill="currentColor" />
              </motion.div>
              <motion.div
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute -inset-2 bg-gradient-to-br from-white via-white/80 to-white/60 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>TripX</h1>
              <p className="text-xs text-white/90 font-medium" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>Travel. Earn. Explore.</p>
            </div>
          </motion.div>
        </div>
        <nav className="relative flex-1 p-4 space-y-1" style={{ backgroundColor: 'transparent' }}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileHover={{ x: 4 }}
                onClick={() => onNavigate(item.id)}
                className={`w-full group relative overflow-hidden rounded-xl transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-white/90 hover:text-white'
                }`}
                style={{
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  backdropFilter: isActive ? 'blur(5px)' : 'blur(2px)',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.03)' : 'transparent'
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl border border-white/[0.06]"
                    style={{
                      backdropFilter: 'blur(5px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      boxShadow: '0 2px 8px rgba(255, 255, 255, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative flex items-center gap-3 px-4 py-3.5">
                  <motion.div
                    animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'text-white' : 'text-white/90 group-hover:text-white group-hover:scale-110'}`} />
                  </motion.div>
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute right-4 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50"
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </nav>
      </motion.aside>
      <motion.div
        ref={mobileMenuRef}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-[2px] border-t-0 z-50 shadow-none"
      >
        <div className="flex items-center justify-around px-4 py-4">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 relative ${
                  isActive ? 'text-white' : 'text-white/50'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="mobileActive"
                      className="absolute -inset-2 bg-white/10 rounded-xl -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium">{item.label.split(' ')[0]}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
};
