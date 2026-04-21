import React from 'react';
import { FARM_ITEMS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const Farm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBooking = (productId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/booking?type=farm&id=${productId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 space-y-20">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight">"흙내음 속에서 빚어내는 우리 가족의 특별한 주말."</h1>
        <p className="text-[#8E9299] leading-relaxed">
          도심을 벗어나 자연과 교감하는 시간. 아이들의 웃음소리가 끊이지 않는 프롬농장에서 직접 만지고, 수확하고, 맛보는 진짜 '경험'을 예약하세요. 
          <span className="text-red-500 font-bold block mt-2">(이번 주말, 남은 자리가 얼마 없습니다.)</span>
        </p>
      </div>

      {/* Experience List */}
      <div className="space-y-16">
        {FARM_ITEMS.map((item, idx) => (
          <div key={item.id} className={`flex flex-col md:flex-row items-center gap-12 ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
            <div className="w-full md:w-1/2 relative h-[500px] overflow-hidden rounded-[40px] shadow-2xl">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="w-full md:w-1/2 space-y-6">
              <div className="text-xs uppercase tracking-[0.3em] bg-[#5A5A40] text-white inline-block px-3 py-1 rounded">SEASONAL EXPERIENCE</div>
              <h2 className="text-4xl font-bold">{item.name}</h2>
              <p className="text-lg text-[#8E9299] leading-relaxed">
                {item.description}
                <br /><br />
                직접 흙을 만지며 생명의 소중함을 배우고, 수확한 신선한 열매를 그 자리에서 맛볼 수 있는 특별한 패밀리 프로그램입니다. 모든 장비는 무상으로 대여해 드립니다.
              </p>
              <div className="text-2xl font-bold">인당 {item.price.toLocaleString()}원</div>
              <button 
                onClick={() => handleBooking(item.id)}
                className="w-full md:w-auto bg-[#5A5A40] text-white px-10 py-4 rounded-full font-bold flex items-center justify-center space-x-2 hover:bg-[#4A4A35] transition-all transform hover:scale-105"
              >
                <Calendar size={20} />
                <span>체험 예약하기</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Farm;
