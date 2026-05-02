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

      {/* Experience List Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-12 pb-20 px-4">
        {FARM_ITEMS.map((item) => (
          <div key={item.id} className="flex flex-col space-y-4 group">
            <div className="relative aspect-square overflow-hidden rounded-2xl md:rounded-[40px] shadow-lg md:shadow-2xl">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <div className="text-[8px] md:text-xs uppercase tracking-widest bg-[#5A5A40] text-white px-2 md:px-3 py-1 rounded shadow-lg">SEASONAL</div>
              </div>
            </div>
            
            <div className="space-y-2 md:space-y-4 px-1">
              <h2 className="text-lg md:text-3xl font-bold tracking-tight line-clamp-1">{item.name}</h2>
              <p className="text-[10px] md:text-base text-[#8E9299] leading-relaxed line-clamp-2">
                {item.description}
              </p>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 pt-2">
                <div className="text-sm md:text-xl font-bold">{item.price.toLocaleString()}원</div>
                <button 
                  onClick={() => handleBooking(item.id)}
                  className="w-full md:w-auto bg-[#5A5A40] text-white px-4 md:px-6 py-2 md:py-3 rounded-full text-[10px] md:text-sm font-bold flex items-center justify-center space-x-2 hover:bg-[#4A4A35] transition-all"
                >
                  <Calendar size={14} className="md:w-4 md:h-4" />
                  <span>예약하기</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Farm;
