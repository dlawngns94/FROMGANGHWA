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
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1600&h=600" 
            alt="Ganghwa Moment" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="relative z-20 text-center text-white px-4">
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            className="text-sm uppercase tracking-[0.3em] mb-4"
          >
            GANGHWA ISLAND MOMENTS
          </motion.p>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-light mb-6 tracking-tight italic"
          >
            강화의 온전한 하루를 당신에게
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed"
          >
            발길 닿는 곳마다 쉼이 되고, 맛보는 것마다 추억이 되는 곳.<br />
            강화가 내어주는 가장 좋은 것들만 모았습니다.
          </motion.p>
        </div>
      </section>

      {/* Categories Multi-Column Split */}
      <section className="flex flex-col md:flex-row w-full border-t border-brand-line min-h-[500px]">
        {[
          { id: '01', sub: 'Special Local Products', title: '프롬스토어', desc: '해풍 맞고 자란 강화의 진심을 식탁으로. 맑은 바람과 비옥한 흙이 키워낸 신선함을 배달합니다.', path: '/store', img: 'https://images.unsplash.com/photo-1488459711615-22871e410246?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '02', sub: 'Farm Experience', title: '프롬농장', desc: '도심을 벗어나 자연과 교감하는 시간. 직접 만지고 수확하며 빚어내는 특별한 주말을 예약하세요.', path: '/farm', img: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '03', sub: 'Premium Stay', title: '프롬스테이', desc: '별이 쏟아지는 강화의 밤, 고즈넉한 쉼표. 포근한 침구와 풍경이 당신의 고단함을 씻어줍니다.', path: '/stay', img: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&q=80&w=800&h=1200' },
        ].map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(item.path)}
            className={`flex-1 relative group cursor-pointer overflow-hidden min-h-[400px] border-brand-line ${idx !== 2 ? 'md:border-r' : ''}`}
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: `url('${item.img}')` }}></div>
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" />
            
            <div className="absolute inset-0 p-10 flex flex-col justify-end text-white">
              <span className="text-[10px] uppercase tracking-widest mb-3 opacity-80 font-sans">{item.id} / {item.sub}</span>
              <h3 className="text-3xl mb-4 italic font-light">{item.title}</h3>
              <p className="text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 font-sans font-light">
                {item.desc}
              </p>
              <div className="mt-6 flex items-center space-x-2 text-[10px] uppercase tracking-[0.2em] font-bold border-b border-transparent group-hover:border-white w-fit pb-1 transition-all">
                <span>Discover</span>
                <ArrowRight size={10} />
              </div>
            </div>
          </motion.div>
        ))}
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
