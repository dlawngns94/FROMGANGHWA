import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, User, MapPin, ShoppingBag, Home, Calendar, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: '홈', path: '/', icon: Home },
    { name: '프롬스토어', path: '/store', icon: ShoppingBag },
    { name: '프롬농장', path: '/farm', icon: MapPin },
    { name: '프롬스테이', path: '/stay', icon: Calendar },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ name: '관리자', path: '/admin', icon: Settings });
  }

  const authenticated = !!user || !!profile;
  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink font-serif flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-brand-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-10">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">FG</span>
              </div>
              <Link to="/" className="text-xl font-medium tracking-tight text-brand-ink">
                프롬강화
              </Link>
            </div>
            
            <div className="hidden md:flex space-x-10">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors hover:text-black ${
                    location.pathname === item.path ? 'text-brand-ink' : 'text-brand-primary'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="flex items-center space-x-6">
              {!authenticated ? (
                <Link to="/login" className="text-xs font-semibold uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors">
                  LOGIN
                </Link>
              ) : (
                <div className="flex items-center gap-4">
                   <Link to="/profile" className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
                    {displayName}
                  </Link>
                  <button onClick={() => auth.signOut()} className="text-[10px] uppercase tracking-tighter opacity-40 hover:opacity-100">LOGOUT</button>
                </div>
              )}
              <Link to="/store" className="bg-brand-primary text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-wider hover:opacity-90 transition-opacity">
                RESERVE
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white px-4 sm:px-10 py-6 flex flex-col md:flex-row items-center justify-between border-t border-brand-line gap-6 font-sans">
        <div className="flex flex-wrap items-center justify-center gap-8 text-[11px] font-medium text-brand-muted uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            프롬스테이: 예약가능
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
            프롬농장: 잔여 4석
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            프롬스토어: 오늘발송 가능
          </div>
        </div>
        
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2 py-1 px-3 bg-naver-pay rounded text-white text-[10px] font-bold">
            <span className="text-lg leading-none mt-0.5">N</span> 
            <span>Pay 결제 시 5% 적립</span>
          </div>
          <p className="text-[10px] text-brand-muted font-medium">
            © 2024 FROM GANGHWA. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
