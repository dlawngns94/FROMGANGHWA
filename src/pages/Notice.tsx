import React, { useState } from 'react';
import { Megaphone, ChevronDown, ChevronUp, Bell, Search } from 'lucide-react';

interface NoticeItem {
  id: string;
  title: string;
  date: string;
  category: '공지' | '이벤트' | '배송안내';
  content: string;
  important?: boolean;
}

const NOTICES: NoticeItem[] = [
  {
    id: 'n-1',
    title: '프롬강화 온라인 스토어 리뉴얼 오픈 안내',
    date: '2026.07.20',
    category: '공지',
    important: true,
    content: `안녕하세요, 프롬강화입니다.

강화도의 숨은 이야기와 가치를 담은 프롬강화 온라인 스토어가 한층 새로워진 모습으로 리뉴얼 오픈하였습니다.

[주요 개선 사항]
• 자체브랜드(리빙/의류/기타) 단독 상품 라인업 신설
• 제철 특산 농산물(강화속노란고구마, 강화섬쌀) 직배송 시스템 구축
• 이리저리 체험관(소창, 쪽, 여행) 온라인 사전 예약 기능 추가
• 네이버페이 결제 지원 및 5% 적립 혜택 제공

새로워진 프롬강화와 함께 강화의 온전한 자연과 따뜻한 삶을 경험해보세요.
감사합니다.`
  },
  {
    id: 'n-2',
    title: '강화속노란고구마 & 섬쌀 제철 수확 및 배송 일정 안내',
    date: '2026.07.15',
    category: '배송안내',
    important: true,
    content: `안녕하세요, 프롬강화 제철상품관입니다.

해풍을 맞아 당도가 더욱 깊은 강화속노란고구마와 미네랄 토양에서 자란 강화섬쌀 수확 및 배송 안내드립니다.

• 배송 방식: 산지 직송 (평일 오후 2시 이전 주문 시 당일 발송)
• 택배사: 우체국 택배 / CJ대한통운
• 신선 식품 특성상 주말/공휴일 전날은 발송이 제한될 수 있습니다.

항상 정직하고 신선한 먹거리로 찾아뵙겠습니다.`
  },
  {
    id: 'n-3',
    title: '이리저리 체험관 (소창 / 쪽염색 / 로컬여행) 예약 관련 안내',
    date: '2026.07.10',
    category: '공지',
    content: `안녕하세요. 이리저리 체험관입니다.

주말 및 공휴일 체험 프로그램은 원활한 운영과 깊이 있는 체험을 위해 100% 사전 예약제로 운영됩니다.

• 체험 종류: 소창 손수건 만들기, 전통 천연 쪽염색, 강화 로컬 감성 투어
• 예약 방법: 상단 메뉴 [이리저리 체험관] -> [예약하기] 버튼을 통해 희망 날짜 선택
• 인원 제한: 클래스당 최대 8인 (소규모 밀착 진행)

문의사항은 [문의] 페이지 또는 고객센터로 연락 주시기 바랍니다.`
  },
  {
    id: 'n-4',
    title: '[이벤트] 프롬강화 회원가입 시 첫 구매 할인 쿠폰 증정',
    date: '2026.07.01',
    category: '이벤트',
    content: `프롬강화의 새로운 가족이 되어주시는 모든 분들께 3,000원 신규 가입 할인 쿠폰을 드립니다.

• 쿠폰 발급: 신규 회원가입 즉시 자동 발급
• 유효 기간: 발급일로부터 30일
• 사용 조건: 20,000원 이상 구매 시 적용 가능

강화의 온기를 담은 상품들을 특별한 혜택으로 만나보세요!`
  }
];

const Notice: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('n-1');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  const categories = ['전체', '공지', '이벤트', '배송안내'];

  const filteredNotices = NOTICES.filter((item) => {
    const matchesCat = selectedCategory === '전체' || item.category === selectedCategory;
    const matchesSearch = item.title.includes(searchTerm) || item.content.includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const toggleNotice = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-serif">
      {/* Header Banner */}
      <header className="py-16 sm:py-20 px-6 border-b border-brand-line text-center bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-muted font-sans font-bold flex items-center justify-center gap-1.5">
            <Bell size={12} /> Notice & News
          </span>
          <h1 className="text-4xl sm:text-6xl font-light italic">공지사항</h1>
          <p className="text-sm sm:text-base text-brand-muted font-sans font-light max-w-xl mx-auto leading-relaxed">
            프롬강화의 새로운 소식과 주요 안내사항을 전해드립니다.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 w-full space-y-8">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-brand-line">
          {/* Categories */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-sans font-bold tracking-wider transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-white text-brand-muted border border-brand-line hover:border-brand-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-brand-line rounded-full text-xs font-sans focus:outline-none focus:border-brand-primary"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
          </div>
        </div>

        {/* Accordion Notice List */}
        <div className="bg-white rounded-3xl border border-brand-line overflow-hidden divide-y divide-brand-line shadow-sm">
          {filteredNotices.length === 0 ? (
            <div className="py-16 text-center text-brand-muted font-sans text-sm">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredNotices.map((notice) => {
              const isOpen = openId === notice.id;
              return (
                <div key={notice.id} className="transition-colors hover:bg-gray-50/50">
                  <button
                    onClick={() => toggleNotice(notice.id)}
                    className="w-full text-left p-6 sm:p-8 flex items-start sm:items-center justify-between gap-4 focus:outline-none"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {notice.important && (
                          <span className="bg-red-500 text-white text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                            중요
                          </span>
                        )}
                        <span className="bg-brand-bg text-brand-ink border border-brand-line text-[9px] font-sans font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                          {notice.category}
                        </span>
                        <span className="text-[11px] text-brand-muted font-sans">
                          {notice.date}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold font-sans text-brand-ink leading-snug">
                        {notice.title}
                      </h2>
                    </div>
                    <div className="mt-1 sm:mt-0 p-2 text-brand-muted">
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-8 sm:px-8 sm:pb-8 pt-2 text-xs sm:text-sm text-brand-ink/80 font-sans leading-relaxed whitespace-pre-line border-t border-dashed border-brand-line/60 bg-brand-bg/30">
                      {notice.content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default Notice;
