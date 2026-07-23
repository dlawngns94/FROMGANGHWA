import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, User, MapPin, ShoppingBag, Home, Calendar, Settings, Menu, X, Sparkles, BookOpen, BookmarkCheck, Compass, Bell, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: '프롬강화', path: '/about', icon: Compass },
    { name: '자체브랜드', path: '/brand', icon: Sparkles },
    { name: '제철상품관', path: '/store', icon: ShoppingBag },
    { name: '이리저리 체험관', path: '/farm', icon: MapPin },
    { name: '스테이', path: '/stay', icon: Calendar },
    { name: '이야기(매거진)', path: '/magazine', icon: BookOpen },
    { name: '공지사항', path: '/notice', icon: Bell },
    { name: '문의', path: '/contact', icon: MessageSquare },
    { name: '내 예약', path: '/my-bookings', icon: BookmarkCheck },
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
        <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex justify-between h-20 items-center gap-4">
            {/* Left: Brand Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-[10px]">FG</span>
              </div>
              <Link to="/" className="text-xl font-medium tracking-tight text-brand-ink whitespace-nowrap">
                프롬강화
              </Link>
            </div>
            
            {/* Center: Main Nav Items */}
            <div className="hidden xl:flex items-center space-x-3 2xl:space-x-5 overflow-x-auto py-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-xs 2xl:text-sm font-medium transition-colors hover:text-black whitespace-nowrap ${
                    location.pathname === item.path ? 'text-brand-ink font-bold border-b-2 border-brand-primary pb-1' : 'text-brand-primary'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Right: User / Login & Reserve */}
            <div className="flex items-center space-x-3 sm:space-x-5 shrink-0">
              {!authenticated ? (
                <Link to="/login" className="hidden sm:block text-xs font-semibold uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors whitespace-nowrap">
                  LOGIN
                </Link>
              ) : (
                <div className="hidden sm:flex items-center gap-3">
                  <Link to="/my-bookings" className="text-xs font-semibold uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors whitespace-nowrap">
                    {displayName}님
                  </Link>
                  <button onClick={() => auth.signOut()} className="text-[10px] uppercase tracking-tighter opacity-50 hover:opacity-100 whitespace-nowrap">LOGOUT</button>
                </div>
              )}
              <Link to="/store" className="bg-brand-primary text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold tracking-wider hover:opacity-90 transition-opacity whitespace-nowrap">
                RESERVE
              </Link>
              
              {/* Mobile / Tablet Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="xl:hidden p-2 text-brand-ink focus:outline-none"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="xl:hidden bg-white border-b border-brand-line overflow-hidden"
            >
              <div className="px-4 py-6 space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      location.pathname === item.path ? 'bg-brand-bg text-brand-ink' : 'text-brand-primary hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={18} />
                    {item.name}
                  </Link>
                ))}
                
                <div className="pt-4 border-t border-brand-line space-y-4">
                  {!authenticated ? (
                    <Link 
                      to="/login" 
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 text-xs font-bold uppercase tracking-widest text-brand-muted"
                    >
                      LOGIN
                    </Link>
                  ) : (
                    <div className="px-4 space-y-4">
                      <div className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                        {displayName}
                      </div>
                      <button 
                        onClick={() => { auth.signOut(); setIsMenuOpen(false); }}
                        className="block text-[10px] font-bold uppercase tracking-widest text-red-400"
                      >
                        LOGOUT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
