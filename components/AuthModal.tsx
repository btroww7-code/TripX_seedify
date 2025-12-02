import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
            transition={{ 
              type: 'spring',
              damping: 25,
              stiffness: 300,
              duration: 0.4
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl p-8 shadow-2xl"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
          {/* Close Button - Improved with animation */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-2xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-xl border-2 border-white/20 z-[10000]"
            type="button"
            style={{ lineHeight: '1' }}
            title="Close"
          >
            ×
          </motion.button>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-slate-400 text-sm">Sign in with your Google account</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Google Sign In Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-6 py-4 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </motion.button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
