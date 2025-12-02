import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPage, onNavigate }) => {
  return (
    <div className="min-h-screen bg-transparent relative overflow-hidden">
      {/* 3D Interactive Cosmos Background is rendered at App level */}

      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.3, 0.15],
          x: [0, 100, 0],
          y: [0, -50, 0]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-0 right-0 w-[900px] h-[900px] bg-gradient-to-br from-white/10 via-white/5 to-transparent rounded-full blur-3xl pointer-events-none z-1"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.25, 0.1],
          x: [0, -80, 0],
          y: [0, 60, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed bottom-0 left-0 w-[700px] h-[700px] bg-gradient-to-tr from-white/10 via-white/5 to-transparent rounded-full blur-3xl pointer-events-none z-1"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1],
          x: [0, -60, 0],
          y: [0, 80, 0]
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-br from-white/5 via-white/3 to-transparent rounded-full blur-3xl pointer-events-none z-1"
      />

      {/* Enhanced grid pattern overlay with glass effect */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,#000,transparent)] pointer-events-none z-[2]" />
      
      {/* Glass morphism overlay - zmniejszony dla lepszej widoczności kosmosu */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/10 via-transparent to-slate-800/10 backdrop-blur-[0.5px] pointer-events-none z-[3]" />

      <div className="relative flex min-h-screen z-10" style={{ pointerEvents: 'none' }}>
        {/* Sidebar - przezroczysty, kosmos widoczny */}
        <div style={{ pointerEvents: 'auto' }}>
          <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        </div>
        <div className="flex-1 flex flex-col lg:ml-64" style={{ pointerEvents: 'none' }}>
          {/* Header - przezroczysty, kosmos widoczny */}
          <div style={{ pointerEvents: 'auto' }}>
            <Header onNavigate={onNavigate} />
          </div>
          <motion.main
            key={currentPage}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="flex-1 p-4 md:p-8 pb-24 lg:pb-8 relative z-10"
            style={{ backgroundColor: 'transparent', pointerEvents: 'auto' }}
          >
            {children}
          </motion.main>
        </div>
      </div>
    </div>
  );
};
