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

      {/* Stay List Split View */}
      <div className="flex flex-col border-b border-brand-line">
        {STAY_ITEMS.map((item, idx) => (
          <div key={item.id} className={`flex flex-col md:flex-row border-brand-line ${idx !== STAY_ITEMS.length - 1 ? 'border-b' : ''}`}>
            <div className={`w-full md:w-[60%] h-[500px] overflow-hidden ${idx % 2 === 1 ? 'md:order-2' : ''}`}>
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-110"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className={`w-full md:w-[40%] flex flex-col justify-center p-16 bg-white space-y-8 ${idx % 2 === 1 ? 'md:order-1' : ''}`}>
              <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">Premium Accommodation</div>
                <h3 className="text-4xl font-light italic">{item.name}</h3>
                <div className="h-0.5 w-12 bg-brand-primary" />
                <p className="text-brand-muted leading-relaxed font-sans font-light">
                  {item.description} 강화도의 자연을 가장 가까이서 느낄 수 있는 공간으로 설계되었습니다. 사계절의 변화를 창을 통해 한 점의 그림처럼 감상하세요.
                </p>
              </div>
              
              <div className="flex justify-between items-center py-6 border-y border-brand-line">
                <span className="text-xs uppercase tracking-widest text-brand-muted font-sans font-bold">Per Night</span>
                <span className="text-2xl font-bold tracking-tighter italic">{item.price.toLocaleString()} KRW</span>
              </div>

              <button 
                onClick={() => handleBooking(item.id)}
                className="bg-brand-primary text-white py-4 rounded-full font-bold text-xs tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center justify-center space-x-3"
              >
                <Bed size={16} />
                <span>Reserve Now</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stay;
