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
          <h1 className="text-5xl font-light italic tracking-tight">"해풍 맞고 자란 강화의 진심을 식탁으로."</h1>
          <p className="text-brand-muted leading-relaxed font-sans font-light">
            강화도의 맑은 바람과 비옥한 흙이 키워냈습니다. <br />
            가장 신선한 때에 거두어, 가장 정성스러운 포장으로 당신의 일상에 강화의 건강함을 배달합니다.
          </p>
        </div>
      </header>

      {/* Product List Grid with design borders */}
      <div className="grid grid-cols-2 md:grid-cols-3 border-b border-brand-line">
        {STORE_ITEMS.map((item, idx) => (
          <div key={item.id} className={`group flex flex-col p-4 sm:p-10 bg-white hover:bg-brand-bg transition-colors border-brand-line ${idx % 2 !== 1 ? 'border-r md:border-r-0' : ''} ${idx % 3 !== 2 ? 'md:border-r' : ''} border-b md:border-b-0`}>
            <div className="relative overflow-hidden aspect-[4/5] mb-4 sm:mb-8">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-0 right-0 bg-brand-primary text-white text-[7px] sm:text-[9px] font-bold uppercase tracking-widest px-2 sm:px-3 py-1">{item.unit}</div>
            </div>
            
            <div className="flex-1 space-y-1 sm:space-y-3">
              <div className="text-[8px] sm:text-[10px] uppercase tracking-widest text-brand-muted font-sans italic">Premium Produce</div>
              <h3 className="text-xl sm:text-3xl font-light italic">{item.name}</h3>
              <p className="hidden sm:block text-sm text-brand-muted leading-relaxed font-sans font-light line-clamp-3">
                {item.description}
              </p>
            </div>
            
            <div className="pt-4 sm:pt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-sm sm:text-2xl font-bold tracking-tighter italic">{item.price.toLocaleString()} KRW</div>
              <button 
                onClick={() => handleOrder(item.id)}
                className="flex items-center justify-center space-x-2 bg-brand-primary text-white px-4 sm:px-8 py-2 sm:py-3 rounded-full text-[9px] sm:text-xs font-bold tracking-widest hover:opacity-90 transition-all uppercase"
              >
                <ShoppingCart size={12} className="sm:w-[14px]" />
                <span>Order</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Store;
