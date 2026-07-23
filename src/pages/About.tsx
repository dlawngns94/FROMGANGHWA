import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Compass, Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      {/* Brand Hero */}
      <section className="relative h-[480px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1600&h=800" 
            alt="From Ganghwa Landscape" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="relative z-20 text-center text-white px-6 max-w-3xl mx-auto space-y-4">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs uppercase tracking-[0.4em] font-sans font-bold opacity-80"
          >
            Brand Story & Philosophy
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-light italic tracking-tight"
          >
            강화의 바람, 흙, 그리고 이야기
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg font-light font-sans leading-relaxed pt-2 text-gray-200"
          >
            ‘프롬강화’는 강화도의 풍요로운 자연과 오래된 이야기, 사람들의 온기를 정성스럽게 담아 전달하는 로컬 브랜드 라이프스타일 플랫폼입니다.
          </motion.p>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-20 px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-muted font-sans font-bold">OUR MISSION</span>
          <h2 className="text-3xl sm:text-5xl font-light italic">The first Breath of Home</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-brand-line pt-12">
          <div className="p-8 bg-white border border-brand-line rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-primary">
              <MapPin size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans">로컬의 진심 (Local Origin)</h3>
            <p className="text-xs text-brand-muted font-sans leading-relaxed">
              강화도 농부들과 장인들이 정성껏 키우고 만든 100% 로컬 오리지널 상품만을 엄선하여 선사합니다.
            </p>
          </div>

          <div className="p-8 bg-white border border-brand-line rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-primary">
              <Compass size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans">지속 가능한 순환 (Sustainability)</h3>
            <p className="text-xs text-brand-muted font-sans leading-relaxed">
              환경과 지역 사회가 함께 공존할 수 있도록 친환경 포장재와 공정 무역 가치를 최우선으로 생각합니다.
            </p>
          </div>

          <div className="p-8 bg-white border border-brand-line rounded-3xl space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-brand-bg flex items-center justify-center text-brand-primary">
              <Heart size={24} />
            </div>
            <h3 className="text-xl font-bold font-sans">온전한 휴식 (Authentic Rest)</h3>
            <p className="text-xs text-brand-muted font-sans leading-relaxed">
              바쁜 도심에서 벗어나 강화의 풍경 속에서 온전한 재충전과 여유를 즐길 수 있도록 돕습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Showcase */}
      <section className="bg-white py-20 border-y border-brand-line">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-brand-muted font-sans font-bold">GANGHWA HERITAGE</span>
            <h2 className="text-3xl sm:text-5xl font-light italic leading-tight">
              해풍과 황금빛 들녘이<br />빚어낸 감동
            </h2>
            <p className="text-sm text-brand-muted font-sans leading-relaxed">
              서해의 해풍과 풍부한 일조량, 유기물 토양이 만나 탄생한 강화 섬쌀과 사자발쑥, 순무, 인삼은 독보적인 향과 풍미를 가집니다. 프롬강화는 계절마다 찾아오는 자연의 선물을 가장 아름다운 방식으로 조명합니다.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <Link 
                to="/store" 
                className="inline-flex items-center gap-2 bg-brand-primary text-white px-8 py-3 rounded-full text-xs font-bold font-sans tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                제철상품관 둘러보기 <ArrowRight size={14} />
              </Link>
              <Link 
                to="/brand" 
                className="inline-flex items-center gap-2 border border-brand-line px-8 py-3 rounded-full text-xs font-bold font-sans tracking-widest uppercase hover:bg-brand-bg transition-colors"
              >
                자체브랜드 보기
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img 
              src="https://images.unsplash.com/photo-1488459711615-22871e410246?auto=format&fit=crop&q=80&w=600&h=800" 
              alt="Fresh produce" 
              className="rounded-3xl h-64 sm:h-80 w-full object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
            <img 
              src="https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&q=80&w=600&h=800" 
              alt="Ganghwa stay" 
              className="rounded-3xl h-64 sm:h-80 w-full object-cover shadow-sm mt-8"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
