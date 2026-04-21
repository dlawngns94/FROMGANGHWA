import { Product } from './types';

export const STORE_ITEMS: Product[] = [
  {
    id: 'store-1',
    name: '강화 순무김치',
    category: 'store',
    price: 15000,
    unit: '2kg',
    description: '강화도의 해풍을 맞고 자란 순무로 담근 알싸하고 시원한 김치입니다.',
    imageUrl: 'https://picsum.photos/seed/kimchi/800/600',
  },
  {
    id: 'store-2',
    name: '강화 사자발약쑥차',
    category: 'store',
    price: 25000,
    unit: '50g',
    description: '강화도의 사자발약쑥을 정성껏 말려 만든 건강한 차입니다.',
    imageUrl: 'https://picsum.photos/seed/mugwort/800/600',
  },
  {
    id: 'store-3',
    name: '강화 섬쌀',
    category: 'store',
    price: 38000,
    unit: '10kg',
    description: '비옥한 간척지에서 자라 찰기가 넘치고 고소한 강화도 대표 쌀입니다.',
    imageUrl: 'https://picsum.photos/seed/rice/800/600',
  },
];

export const FARM_ITEMS: Product[] = [
  {
    id: 'farm-1',
    name: '딸기 수확 체험',
    category: 'farm',
    price: 15000,
    unit: '1인',
    description: '달콤한 강화도 딸기를 직접 따보고 맛보는 즐거운 시간.',
    imageUrl: 'https://picsum.photos/seed/strawberry/800/600',
  },
  {
    id: 'farm-2',
    name: '고구마 캐기 체험',
    category: 'farm',
    price: 12000,
    unit: '1인',
    description: '강화도 속노랑 고구마를 직접 캐보는 뿌듯한 가을 체험.',
    imageUrl: 'https://picsum.photos/seed/sweetpotato/800/600',
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
