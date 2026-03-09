'use client';

import { AppProvider, useApp } from '@/lib/app-context';
import LoginPage from '@/components/pages/LoginPage';
import Dashboard from '@/components/pages/Dashboard';
import TrailerDetails from '@/components/pages/TrailerDetails';
import { useState, useEffect } from 'react';

function AppContent() {
  const { isAuthenticated } = useApp();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'details'>('dashboard');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (currentPage === 'details' && selectedTrailerId) {
    return (
      <TrailerDetails
        trailerId={selectedTrailerId}
        onBack={() => {
          setCurrentPage('dashboard');
          setSelectedTrailerId(null);
        }}
      />
    );
  }

  return (
    <Dashboard
      onSelectTrailer={(trailerId) => {
        setSelectedTrailerId(trailerId);
        setCurrentPage('details');
      }}
    />
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
