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

      {/* Categories Multi-Column Split */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 w-full border-t border-brand-line min-h-[420px]">
        {[
          { id: '01', sub: 'Brand Story', title: '프롬강화', desc: '강화의 바람, 흙, 그리고 이야기. 프롬강화의 철학과 비전을 만납니다.', path: '/about', img: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '02', sub: 'Original Goods', title: '자체브랜드', desc: '사자발쑥 차 세트부터 수공예 찻잔까지, 프롬강화 단독 컬렉션.', path: '/brand', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '03', sub: 'Fresh Produce', title: '제철상품관', desc: '해풍 맞고 자란 강화 섬쌀과 특산 농산물을 신선하게 배달합니다.', path: '/store', img: 'https://images.unsplash.com/photo-1488459711615-22871e410246?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '04', sub: 'Farm & Activity', title: '이리저리 체험관', desc: '도심을 벗어나 자연과 교감하는 특별한 농장 체험을 예약하세요.', path: '/farm', img: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '05', sub: 'Ganghwa Rest', title: '스테이', desc: '별이 쏟아지는 강화의 밤, 고즈넉한 한옥과 자연 속 고요한 쉼.', path: '/stay', img: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '06', sub: 'Local Stories', title: '이야기(매거진)', desc: '강화의 농부, 사람, 공간이 들려주는 깊고 잔잔한 감성 에세이.', path: '/magazine', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '07', sub: 'Notice & News', title: '공지사항', desc: '프롬강화의 새로운 소식과 주요 이벤트/운영 안내를 확인하세요.', path: '/notice', img: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800&h=1200' },
          { id: '08', sub: 'Contact Us', title: '문의', desc: '궁금하신 점이나 제휴/대량구매 문의를 남겨주시면 신속히 답변드립니다.', path: '/contact', img: 'https://images.unsplash.com/photo-1534536281715-e28d76741770?auto=format&fit=crop&q=80&w=800&h=1200' },
        ].map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(item.path)}
            className={`relative group cursor-pointer overflow-hidden min-h-[360px] border-b lg:border-b-0 border-brand-line ${idx !== 7 ? 'lg:border-r' : ''}`}
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105" style={{ backgroundImage: `url('${item.img}')` }}></div>
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors" />
            
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end text-white">
              <span className="text-[9px] uppercase tracking-widest mb-1.5 opacity-80 font-sans">{item.id} / {item.sub}</span>
              <h3 className="text-lg sm:text-xl mb-1.5 italic font-light leading-snug">{item.title}</h3>
              <p className="text-[10px] sm:text-[11px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 font-sans font-light line-clamp-3">
                {item.desc}
              </p>
              <div className="mt-2.5 flex items-center space-x-1.5 text-[8px] uppercase tracking-[0.2em] font-bold border-b border-transparent group-hover:border-white w-fit pb-1 transition-all">
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
