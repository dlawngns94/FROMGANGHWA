import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ShoppingBag, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[360px] sm:h-[400px] flex items-start justify-center pt-12 sm:pt-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1600&h=600" 
            alt="Ganghwa Moment" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-20 text-center text-white px-4 space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight drop-shadow-md"
          >
            &lt; 프 롬 강 화 &gt;
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-2xl font-light tracking-wide text-gray-100"
          >
            지역의 매력을 소개합니다.
          </motion.p>
        </div>
      </section>



      {/* Editor's Pick Section with Design Borders */}
      <section className="bg-white py-24 border-t border-brand-line">
        <div className="max-w-7xl mx-auto px-10">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-16 gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-brand-muted mb-3 font-sans font-bold">Recommended</div>
              <h2 className="text-5xl font-light italic">베스트셀러</h2>
            </div>
            <Link to="/store" className="text-xs uppercase tracking-widest font-bold border-b border-brand-ink pb-1">
              View All Collection
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 border-l border-t border-brand-line">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group border-r border-b border-brand-line p-6 hover:bg-brand-bg transition-colors">
                <div className="relative aspect-[3/4] overflow-hidden mb-6">
                  <img 
                    src={`https://picsum.photos/seed/best-item-${i}/600/800`} 
                    alt="Best Selection" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-0 right-0 bg-brand-primary text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1">New</div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-brand-muted font-sans italic">Premium Selection</div>
                  <h4 className="font-medium text-lg leading-tight">강화의 진심을 담은 {i}호</h4>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-sm tracking-tight">15,000 KRW</span>
                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
