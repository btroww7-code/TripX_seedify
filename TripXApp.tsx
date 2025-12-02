import React, { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/pages/Dashboard';
import { CreateTrip } from './components/pages/CreateTrip';
import { MyQuests } from './components/pages/MyQuests';
import { MyTrips } from './components/pages/MyTrips';
import { Profile } from './components/pages/Profile';
import { Leaderboard } from './components/pages/Leaderboard';
import { Achievements } from './components/pages/Achievements';
import { TransitPlanner } from './components/pages/Transit';
import { AdminDashboard } from './components/pages/Admin';

interface Quest {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: number;
  reward: number;
  day: number;
  lat?: number;
  lng?: number;
  completed?: boolean;
  verified?: boolean;
}

export const TripXApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [transitParams, setTransitParams] = useState<any>(null);

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    if (page === 'transit' && params) {
      setTransitParams(params);
    }
  };

  useEffect(() => {
    // Listen for navigation events from quest modals
    const handleNavigateToTransit = (event: CustomEvent) => {
      handleNavigate('transit', event.detail);
    };

    window.addEventListener('navigateToTransit' as any, handleNavigateToTransit as EventListener);
    return () => {
      window.removeEventListener('navigateToTransit' as any, handleNavigateToTransit as EventListener);
    };
  }, []);

  const handleTripGenerated = (tripData: any) => {
    setQuests(tripData.quests);
  };

  const handleQuestComplete = (questId: string, photo: string) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId ? { ...q, completed: true, verified: true } : q
      )
    );
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'transit':
        return <TransitPlanner transitParams={transitParams} />;
      case 'create':
        return <CreateTrip onTripGenerated={handleTripGenerated} onNavigate={handleNavigate} />;
      case 'trips':
        return <MyTrips onNavigate={handleNavigate} />;
      case 'quests':
        return <MyQuests onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;
      case 'leaderboard':
        return <Leaderboard />;
      case 'achievements':
        return <Achievements />;
      case 'admin':
        return <AdminDashboard onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // Admin panel should render without MainLayout
  if (currentPage === 'admin') {
    return <AdminDashboard onNavigate={handleNavigate} />;
  }

  return (
    <MainLayout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </MainLayout>
  );
};
