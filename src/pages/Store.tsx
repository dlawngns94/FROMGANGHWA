import React from 'react';
import { STORE_ITEMS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

const Store: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleOrder = (productId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/booking?type=store&id=${productId}`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="py-24 px-10 text-center border-b border-brand-line bg-white">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-[10px] uppercase tracking-[0.4em] text-brand-muted font-sans font-bold">Local Specialties</div>
          <h1 className="text-4xl sm:text-6xl font-light italic tracking-tight">제철상품관</h1>
          <p className="text-brand-muted leading-relaxed font-sans font-light">
            해풍 맞고 자란 강화의 진심을 식탁으로. <br />
            가장 신선한 때에 거두어, 가장 정성스러운 포장으로 당신의 일상에 강화의 건강함을 배달합니다.
          </p>
        </div>
      </header>

      {/* Product List Grid with design borders */}
      <div className="max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {STORE_ITEMS.map((item) => (
            <div key={item.id} className="group flex flex-col p-6 sm:p-10 bg-white rounded-3xl border border-brand-line hover:shadow-lg transition-all">
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] mb-6 bg-gray-100">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 right-3 bg-brand-primary text-white text-[9px] sm:text-[10px] font-bold font-sans uppercase tracking-widest px-3 py-1 rounded-full">{item.unit}</div>
              </div>
              
              <div className="flex-1 space-y-2 sm:space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">Premium Produce</div>
                <h3 className="text-2xl sm:text-3xl font-bold font-sans italic text-brand-ink">{item.name}</h3>
                <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-sans font-light">
                  {item.description}
                </p>
              </div>
              
              <div className="pt-6 sm:pt-8 mt-6 border-t border-brand-line flex items-center justify-between gap-3">
                <div className="text-xl sm:text-2xl font-bold tracking-tight italic">{item.price.toLocaleString()} KRW</div>
                <button 
                  onClick={() => handleOrder(item.id)}
                  className="flex items-center justify-center space-x-2 bg-brand-primary text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs font-bold font-sans tracking-widest hover:opacity-90 transition-all uppercase"
                >
                  <ShoppingCart size={14} />
                  <span>구매하기</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Store;
