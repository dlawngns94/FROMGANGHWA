import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Sparkles } from 'lucide-react';
import mugwortImg from '../assets/images/ganghwa_mugwort_1784939160625.jpg';
import sochangImg from '../assets/images/ganghwa_sochang_1784939147927.jpg';

export interface BrandProduct {
  id: string;
  name: string;
  category: '리빙' | '의류' | '기타';
  price: number;
  description: string;
  imageUrl: string;
  tag: string;
}

export const BRAND_PRODUCTS: BrandProduct[] = [
  {
    id: 'brand-1',
    name: '고즈넉한 쉼 드라잉 수공예 도자기 찻잔',
    category: '리빙',
    price: 45000,
    description: '강화도 도예 장인의 손길로 한 땀 한 땀 구워낸 수제 찻잔. 흙의 정겨운 질감이 입술에 부드럽게 닿습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=800&h=1000',
    tag: 'HANDMADE'
  },
  {
    id: 'brand-2',
    name: '사자발쑥 시그니처 룸 스프레이 & 인센스',
    category: '리빙',
    price: 35000,
    description: '공간 가득 고요하고 평온한 강화도의 숲향을 채워주는 아로마틱 룸 믹스 세트입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&q=80&w=800&h=1000',
    tag: 'ESSENTIAL'
  },
  {
    id: 'brand-3',
    name: '갯벌 바람을 담은 오가닉 린넨 원피스 & 로브',
    category: '의류',
    price: 89000,
    description: '강화의 자연 색감을 담아낸 내츄럴 린넨 의류. 통기성이 뛰어나고 편안한 착용감을 선사합니다.',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800&h=1000',
    tag: 'NEW'
  },
  {
    id: 'brand-4',
    name: '강화 순면 루즈핏 이지웨어 셋업',
    category: '의류',
    price: 68000,
    description: '100% 프리미엄 순면 소재로 제작되어 집에서도, 야외 산책에서도 고즈넉하게 입을 수 있는 로컬 이지웨어.',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800&h=1000',
    tag: 'BEST SELLER'
  },
  {
    id: 'brand-5',
    name: '프롬강화 시그니처 쑥차 블렌딩 티 세트',
    category: '기타',
    price: 28000,
    description: '강화 특산 사자발쑥과 제주 유기농 귤피를 최적의 비율로 로스팅하여 은은한 향과 따뜻한 온기를 선사합니다.',
    imageUrl: mugwortImg,
    tag: 'SIGNATURE'
  },
  {
    id: 'brand-6',
    name: '강화 섬쌀 수제 센베이 & 인삼 핸드크림 기프트',
    category: '기타',
    price: 25000,
    description: '고소한 섬쌀 스낵과 강화 6년근 인삼 핸드크림이 담긴 프롬강화 특별 기프트 패키지입니다.',
    imageUrl: 'https://images.unsplash.com/photo-1608248597261-8332570544c0?auto=format&fit=crop&q=80&w=800&h=1000',
    tag: 'GIFT'
  }
];

const CATEGORIES = ['전체', '리빙', '의류', '기타'] as const;

const Brand: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const handleOrder = (product: BrandProduct) => {
    navigate('/booking', { state: { category: 'store', product } });
  };

  const filteredProducts = selectedCategory === '전체'
    ? BRAND_PRODUCTS
    : BRAND_PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      {/* Header Banner */}
      <header className="bg-white border-b border-brand-line py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.4em] text-brand-muted font-sans font-bold flex items-center justify-center gap-2">
            <Sparkles size={14} className="text-brand-primary" />
            FROM GANGHWA OWN BRAND
          </span>
          <h1 className="text-4xl sm:text-6xl font-light italic">자체브랜드 관</h1>
          <p className="text-sm sm:text-base text-brand-muted font-sans font-light max-w-xl mx-auto leading-relaxed">
            강화의 자연에서 영감을 받아 기획하고 단독 제작한 프롬강화만의 오리지널 라이프스타일 컬렉션입니다.
          </p>
        </div>
      </header>

      {/* Category Tabs & Grid List */}
      <main className="max-w-7xl mx-auto px-6 py-12 w-full space-y-10">
        {/* Category Navigation Tabs */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-full text-xs font-sans font-bold tracking-wider transition-all uppercase ${
                selectedCategory === category
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'bg-white text-brand-muted border border-brand-line hover:border-brand-primary hover:text-brand-primary'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className="bg-white rounded-3xl border border-brand-line overflow-hidden flex flex-col group hover:shadow-lg transition-all duration-300"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-4 left-4 bg-brand-primary text-white text-[9px] font-bold font-sans tracking-widest px-3 py-1 rounded-full uppercase">
                  {product.tag}
                </span>
              </div>

              <div className="p-8 flex flex-col flex-1 justify-between space-y-6">
                <div className="space-y-3">
                  <div className="text-[10px] text-brand-muted font-sans font-bold uppercase tracking-widest">
                    {product.category}
                  </div>
                  <h3 className="text-2xl font-bold font-sans italic text-brand-ink">
                    {product.name}
                  </h3>
                  <p className="text-xs text-brand-muted font-sans leading-relaxed line-clamp-3">
                    {product.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-brand-line flex items-center justify-between">
                  <div className="text-xl font-bold italic tracking-tight">
                    {product.price.toLocaleString()} KRW
                  </div>
                  <button 
                    onClick={() => handleOrder(product)}
                    className="flex items-center gap-2 bg-brand-primary text-white px-6 py-2.5 rounded-full text-xs font-bold font-sans tracking-widest uppercase hover:opacity-90 transition-opacity"
                  >
                    <ShoppingBag size={14} />
                    구매하기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Brand;
