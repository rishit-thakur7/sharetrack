import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import { Toaster } from 'react-hot-toast';

const Landing = React.lazy(() => import('./pages/Landing'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TripHistory = React.lazy(() => import('./pages/TripHistory'));

const LoadingFallback = () => (
  <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(125,211,252,0.2)', borderTopColor: '#7dd3fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: '#475569', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    return <Navigate to="/auth" />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <LocationProvider>
        <NotificationProvider>
          <ChatProvider>
            <Toaster position="top-right" />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/friends" element={
                  <ProtectedRoute>
                    <Dashboard showFriendsInitial={true} />
                  </ProtectedRoute>
                } />
                <Route path="/trips" element={
                  <ProtectedRoute>
                    <TripHistory />
                  </ProtectedRoute>
                } />
              </Routes>
            </Suspense>
          </ChatProvider>
        </NotificationProvider>
      </LocationProvider>
    </BrowserRouter>
  );
}

export default App;