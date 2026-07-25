import React from 'react';
import { FARM_ITEMS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { Calendar, ShoppingCart, Check } from 'lucide-react';
import { Product } from '../types';

const Farm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [addedId, setAddedId] = React.useState<string | null>(null);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleBooking = (productId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/booking?type=farm&id=${productId}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      {/* Header Banner */}
      <header className="py-16 sm:py-20 px-6 border-b border-brand-line text-center bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-muted font-sans font-bold">
            Farm & Activity
          </span>
          <h1 className="text-4xl sm:text-6xl font-light italic">이리저리 체험관</h1>
          <p className="text-sm sm:text-base text-brand-muted font-sans font-light max-w-xl mx-auto leading-relaxed">
            강화의 자연과 전통, 숨은 이야기를 오감으로 경험하는 특별한 로컬 프로그램입니다.
          </p>
        </div>
      </header>

      {/* Experience List Grid */}
      <main className="max-w-7xl mx-auto px-6 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {FARM_ITEMS.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl border border-brand-line overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300">
              <div className="relative overflow-hidden aspect-[4/3] bg-gray-100">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-brand-primary text-white text-[9px] font-bold font-sans uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {item.unit} / 예약
                </div>
              </div>
              
              <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">Local Experience</span>
                  <h2 className="text-2xl sm:text-3xl font-bold font-sans italic text-brand-ink">{item.name}</h2>
                  <p className="text-xs sm:text-sm text-brand-muted font-sans font-light leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-line flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-brand-muted font-sans block">체험비</span>
                    <span className="text-xl font-bold italic text-brand-ink">{item.price.toLocaleString()} KRW</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleAddToCart(item, e)}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-brand-ink rounded-full transition-all"
                      title="장바구니 담기"
                    >
                      {addedId === item.id ? <Check size={16} className="text-green-600" /> : <ShoppingCart size={16} />}
                    </button>

                    <button 
                      onClick={() => handleBooking(item.id)}
                      className="flex items-center space-x-1.5 bg-brand-primary text-white px-5 py-2.5 rounded-full text-xs font-bold font-sans tracking-widest hover:opacity-90 transition-all uppercase"
                    >
                      <Calendar size={14} />
                      <span>예약하기</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Farm;
