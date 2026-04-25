import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { FilterProvider } from './hooks/useFilters';
import { useUrlSync } from './hooks/useUrlSync';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PublicRoute from './components/ui/PublicRoute';
import Sidebar from './components/layout/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Channels from './pages/Channels';
import Campaigns from './pages/Campaigns';
import Traffic from './pages/Traffic';
import Funnel from './pages/Funnel';
import Cohort from './pages/Cohort';
import Import from './pages/Import';
import Segments from './pages/Segments';
import Views from './pages/Views';
import Export from './pages/Export';
import Logs from './pages/Logs';
import Settings from './pages/Settings';

// URL ↔ filtre senkronizasyonu — Router içinde çalışmalı
function UrlSyncWrapper() {
  useUrlSync();
  return null;
}

function AppLayout() {
  return (
    <div style={{ display: 'flex' }}>
      <UrlSyncWrapper />
      <Sidebar />
      <main style={{ marginLeft: 220, flex: 1, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <AuthProvider>
      <FilterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/traffic" element={<Traffic />} />
              <Route path="/funnel" element={<Funnel />} />
              <Route path="/cohort" element={<Cohort />} />
              <Route path="/import" element={<Import />} />
              <Route path="/segments" element={<Segments />} />
              <Route path="/views" element={<Views />} />
              <Route path="/export" element={<Export />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FilterProvider>
    </AuthProvider>
  );
}
