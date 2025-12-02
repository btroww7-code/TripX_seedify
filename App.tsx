import React from 'react';
import { Web3Provider } from './components/Web3Provider';
import { TripXApp } from './TripXApp';
import { CosmosBackground } from './components/CosmosBackground';
import { Toaster } from 'sonner';
import { useActivityTracking } from './hooks/useActivityTracking';

function AppContent() {
  useActivityTracking();
  
  return (
    <TripXApp />
  );
}

function App() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Global Toast Notifications */}
      <Toaster 
        position="top-center"
        richColors
        closeButton
        duration={5000}
        toastOptions={{
          style: {
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            backdropFilter: 'blur(12px)',
          },
        }}
      />
      
      {/* Animated cosmos background - always visible, dokładnie jak w cosmos3d.txt - INTERAKTYWNY */}
      <CosmosBackground starCount={15000} animationSpeed={1} interactionEnabled={true} />
      
      {/* Content layer with glass morphism - przezroczysty z blur */}
      <div className="relative z-10" style={{ backgroundColor: 'transparent' }}>
        <Web3Provider>
          <AppContent />
        </Web3Provider>
      </div>
    </div>
  );
}

export default App;