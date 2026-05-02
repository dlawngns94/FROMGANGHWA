import React from 'react';
import { STAY_ITEMS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Bed } from 'lucide-react';

const Stay: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBooking = (productId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/booking?type=stay&id=${productId}`);
  };

  return (
    <div className="flex flex-col bg-brand-bg min-h-screen">
      {/* Header */}
      <header className="py-32 px-10 text-center border-b border-brand-line bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-[10px] uppercase tracking-[0.5em] text-brand-muted font-sans font-bold">Stay & Reflect</div>
          <h1 className="text-6xl font-light tracking-tight italic leading-tight">
            "별이 쏟아지는 강화의 밤,<br />고즈넉한 쉼표를 찍다."
          </h1>
          <p className="text-lg text-brand-muted leading-relaxed font-sans font-light max-w-2xl mx-auto">
            아무것도 하지 않을 자유, 혹은 자연 속에서 온전히 나를 채우는 시간. <br />
            포근한 침구와 창밖으로 펼쳐지는 강화의 풍경이 당신의 고단함을 씻어줍니다.
          </p>
        </div>
      </header>

      {/* Stay List Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 border-b border-brand-line">
        {STAY_ITEMS.map((item, idx) => (
          <div key={item.id} className={`flex flex-col bg-white border-brand-line border-b hover:bg-brand-bg transition-colors ${idx % 2 === 0 ? 'border-r md:border-r-0' : ''} ${idx % 3 !== 2 ? 'md:border-r' : ''}`}>
            <div className="relative aspect-[4/3] overflow-hidden">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <div className="text-[7px] sm:text-[9px] font-bold uppercase tracking-widest bg-brand-primary text-white px-2 py-1">PREMIUM stay</div>
              </div>
            </div>
            <div className="p-4 sm:p-10 flex flex-col flex-1 space-y-4">
              <div className="space-y-1 sm:space-y-4">
                <div className="text-[8px] sm:text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">Premium Accommodation</div>
                <h3 className="text-lg sm:text-4xl font-light italic leading-tight">{item.name}</h3>
                <p className="hidden sm:block text-brand-muted leading-relaxed font-sans font-light line-clamp-3">
                  {item.description} 강화도의 자연을 가장 가까이서 느낄 수 있는 공간입니다.
                </p>
              </div>
              
              <div className="mt-auto pt-4 sm:pt-6 border-t border-brand-line flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <span className="text-sm sm:text-2xl font-bold tracking-tighter italic">{item.price.toLocaleString()} KRW</span>
                <button 
                  onClick={() => handleBooking(item.id)}
                  className="bg-brand-primary text-white py-2 sm:py-4 px-4 sm:px-8 rounded-full font-bold text-[9px] sm:text-xs tracking-[0.1em] sm:tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center justify-center space-x-2"
                >
                  <Bed size={14} className="sm:w-4 sm:h-4" />
                  <span>Reserve</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stay;
