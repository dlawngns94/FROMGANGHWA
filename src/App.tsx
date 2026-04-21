import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Store from './pages/Store';
import Farm from './pages/Farm';
import Stay from './pages/Stay';
import BookingPage from './pages/Booking';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './hooks/useAuth';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-serif italic text-2xl animate-pulse">from ganghwa...</div>;
  if (profile?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/store" element={<Store />} />
            <Route path="/farm" element={<Farm />} />
            <Route path="/stay" element={<Stay />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
