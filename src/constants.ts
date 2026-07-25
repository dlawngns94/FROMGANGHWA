import { Product } from './types';
import sweetPotatoImg from './assets/images/ganghwa_sweet_potato_1784939123759.jpg';
import riceImg from './assets/images/ganghwa_rice_1784939136856.jpg';
import sochangImg from './assets/images/ganghwa_sochang_1784939147927.jpg';
import indigoImg from './assets/images/ganghwa_indigo_1784939172752.jpg';

export const STORE_ITEMS: Product[] = [
  {
    id: 'store-1',
    name: '강화속노란고구마',
    category: 'store',
    price: 25000,
    unit: '5kg',
    description: '서해 해풍과 풍부한 햇살을 받아 당도가 높고 촉촉한 강화 특산 속노랑 고구마입니다.',
    imageUrl: sweetPotatoImg,
  },
  {
    id: 'store-2',
    name: '강화섬쌀',
    category: 'store',
    price: 38000,
    unit: '10kg',
    description: '비옥한 간척지와 미네랄 풍부한 토양에서 자라 찰기가 넘치고 고소한 강화 대표 섬쌀입니다.',
    imageUrl: riceImg,
  },
];

export const FARM_ITEMS: Product[] = [
  {
    id: 'farm-1',
    name: '소창',
    category: 'farm',
    price: 25000,
    unit: '1인',
    description: '강화의 오랜 역사를 간직한 소창 직물과 나만의 소창 손수건 만들기 체험.',
    imageUrl: sochangImg,
  },
  {
    id: 'farm-2',
    name: '쪽',
    category: 'farm',
    price: 30000,
    unit: '1인',
    description: '자연에서 얻은 깊은 푸른빛으로 스카프와 스카프 천을 물들이는 전통 천연 쪽염색 클래스.',
    imageUrl: indigoImg,
  },
  {
    id: 'farm-3',
    name: '여행',
    category: 'farm',
    price: 40000,
    unit: '1인',
    description: '강화도의 숨은 역사와 잔잔한 골목길, 자연의 숨결을 함께 둘러보는 로컬 감성 투어.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800&h=1000',
  },
];

export const STAY_ITEMS: Product[] = [
  {
    id: 'stay-1',
    name: '프롬스테이 A동',
    category: 'stay',
    price: 180000,
    unit: '1박',
    description: '논뷰가 아름다운 모던하고 고즈넉한 객실.',
    imageUrl: 'https://picsum.photos/seed/stay-a/800/600',
  },
  {
    id: 'stay-2',
    name: '프롬스테이 B동',
    category: 'stay',
    price: 220000,
    unit: '1박',
    description: '프라이빗한 마당이 있는 가족형 스위트 객실.',
    imageUrl: 'https://picsum.photos/seed/stay-b/800/600',
  },
];
