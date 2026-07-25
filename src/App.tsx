import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Brand from './pages/Brand';
import Store from './pages/Store';
import Farm from './pages/Farm';
import Stay from './pages/Stay';
import Magazine from './pages/Magazine';
import Notice from './pages/Notice';
import Contact from './pages/Contact';
import BookingPage from './pages/Booking';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import { CartDrawer } from './components/CartDrawer';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center font-serif italic text-2xl animate-pulse">from ganghwa...</div>;
  if (profile?.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/brand" element={<Brand />} />
              <Route path="/store" element={<Store />} />
              <Route path="/farm" element={<Farm />} />
              <Route path="/stay" element={<Stay />} />
              <Route path="/magazine" element={<Magazine />} />
              <Route path="/notice" element={<Notice />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
          <CartDrawer />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
