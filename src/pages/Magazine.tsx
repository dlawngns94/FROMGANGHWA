import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Clock, User, ArrowRight, Share2, Heart, X } from 'lucide-react';

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  imageUrl: string;
  content: string[];
  likes: number;
}

export const ARTICLES: Article[] = [
  {
    id: 'mag-1',
    title: '해풍을 품은 강화 섬쌀 이야기 : 흙과 농부의 땀방울',
    subtitle: '조선시대 수라상에 올라가던 강화 섬쌀, 그 비결을 찾아 떠난 농가 기행',
    category: '농가 기행',
    author: '에디터 김강화',
    date: '2026.04.18',
    readTime: '5분 읽기',
    likes: 128,
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1000&h=600',
    content: [
      '강화도는 예로부터 삼면이 바다로 둘러싸여 해풍과 일조량이 풍부한 천혜의 농업지대입니다. 특히 찰기가 돌고 단맛이 배어있는 강화 섬쌀은 임금님 수라상에 진상되던 귀한 명품 쌀로 손꼽혀왔습니다.',
      '3대째 강화도 길상면에서 벼농사를 지어오고 있는 이정훈 농부를 만났습니다. "바닷바람이 실어오는 미네랄과 비옥한 게르마늄 황토가 쌀알 하나하나를 단단하고 윤기나게 만들어 줍니다." 농부의 손에 쥐어진 노란 벼이삭에서 깊은 자부심이 느껴졌습니다.',
      '오늘 저녁, 수확한 지 얼마 되지 않은 강화 섬쌀로 지은 갓 구운 솥밥 한 그릇으로 식탁 위에서 강화도의 온전한 봄날을 느껴보시는 건 어떨까요?'
    ]
  },
  {
    id: 'mag-2',
    title: '강화 고택에서의 느린 하룻밤 : 마루에 앉아 듣는 바람소리',
    subtitle: '100년 한옥을 현대적 감각으로 재해석한 공간 프롬스테이 리포트',
    category: '공간 스페셜',
    author: '에디터 이은솔',
    date: '2026.04.02',
    readTime: '7분 읽기',
    likes: 245,
    imageUrl: 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&q=80&w=1000&h=600',
    content: [
      '도시의 소음과 자극적인 조명에 지친 몸과 마음을 이끌고 찾아간 곳은 강화도 고요한 서사면 언덕 끝자락에 위치한 프롬스테이 한옥입니다.',
      '툇마루에 앉아 그윽한 사자발쑥 차 한 잔을 기울이면 능선을 따라 번지는 석양이 가슴을 아늑하게 물들입니다. 오래된 목재 기둥이 전해주는 특유의 묵직한 안식과 현대적인 미니멀한 편의성이 완벽한 조화를 이룹니다.',
      '디지털 기기의 알람을 잠시 꺼두고 밤하늘의 쏟아지는 별을 바라보며 나 자신과의 대화에 집중할 수 있는 진정한 휴식을 제안합니다.'
    ]
  },
  {
    id: 'mag-3',
    title: '강화 사자발쑥, 왜 특별할까요? 효능부터 음용법까지',
    subtitle: '강화도 특산 약쑥의 단단한 생명력과 사계절 다도 팁',
    category: '로컬 컬처',
    author: '한의학 칼럼니스트 박민재',
    date: '2026.03.15',
    readTime: '4분 읽기',
    likes: 96,
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=1000&h=600',
    content: [
      '쑥의 여왕이라 불리는 강화 사자발쑥은 잎 모양이 사자의 발바닥을 닮았다고 하여 붙여진 이름입니다. 강화도의 거친 바람과 염도를 견뎌내며 자라나 유효 성분이 타 지역 쑥에 비해 매우 뛰어납니다.',
      '특히 몸을 따뜻하게 보호해주고 면역력 증진 및 순환을 돕는 것으로 알려져 있어 온 가족 건강 다도 재료로 많은 사랑을 받고 있습니다.',
      '따뜻한 물에 사자발쑥 티백을 3분간 우려내어 꿀 한 스푼을 살짝 얹어 드시면 고소함과 쌉싸름함이 기분 좋게 감도는 깊은 맛을 느끼실 수 있습니다.'
    ]
  },
  {
    id: 'mag-4',
    title: '주말 강화도 드라이브 & 로컬 가이드 맵 5선',
    subtitle: '현지인이 추천하는 고즈넉한 산책로와 정갈한 로컬 맛집',
    category: '트래블 팁',
    author: '에디터 최지훈',
    date: '2026.02.28',
    readTime: '6분 읽기',
    likes: 312,
    imageUrl: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=1000&h=600',
    content: [
      '주말을 맞아 한가롭게 서울 근교 드라이브를 계획하고 계신다면, 초지대교를 넘어 펼쳐지는 강화도의 드넓은 해안도로를 따라 달려보세요.',
      '첫째, 동막해변의 갯벌 산책로에서 서해의 물때를 맞추어 걷기. 둘째, 교동도 대룡시장에서 만나는 정겨운 레트로 골목 투어. 셋째, 고려궁지 둘레길의 오붓한 삼림욕코스까지.',
      '프롬강화가 엄선한 강화도의 비밀 공간 5곳을 소개합니다. 여행의 끝자락에는 제철 농산물 스토어에서 신선한 강화 순무김치와 꿀 한 병을 챙기는 것도 잊지 마세요.'
    ]
  }
];

const Magazine: React.FC = () => {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});

  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikesMap(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="bg-white border-b border-brand-line py-16 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-4">
          <span className="text-xs uppercase tracking-[0.4em] text-brand-muted font-sans font-bold flex items-center justify-center gap-2">
            <BookOpen size={14} className="text-brand-primary" />
            FROM GANGHWA LOCAL MAGAZINE
          </span>
          <h1 className="text-4xl sm:text-6xl font-light italic">이야기 관 (매거진)</h1>
          <p className="text-sm sm:text-base text-brand-muted font-sans font-light max-w-xl mx-auto leading-relaxed">
            강화도의 사람, 공간, 음식, 그리고 자연이 전하는 깊고 잔잔한 이야기들을 기획 에디토리얼로 전해드립니다.
          </p>
        </div>
      </header>

      {/* Main Articles List */}
      <main className="max-w-6xl mx-auto px-6 py-16 w-full space-y-12">
        {/* Featured Article */}
        {ARTICLES[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedArticle(ARTICLES[0])}
            className="bg-white rounded-3xl border border-brand-line overflow-hidden cursor-pointer group hover:shadow-xl transition-all grid grid-cols-1 md:grid-cols-2"
          >
            <div className="relative h-64 md:h-auto overflow-hidden">
              <img 
                src={ARTICLES[0].imageUrl} 
                alt={ARTICLES[0].title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <span className="absolute top-4 left-4 bg-brand-primary text-white text-[9px] font-bold font-sans tracking-widest px-3 py-1 rounded-full uppercase">
                FEATURED STORY
              </span>
            </div>

            <div className="p-8 sm:p-12 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-xs text-brand-muted font-sans">
                  <span className="font-bold text-brand-primary uppercase tracking-widest">{ARTICLES[0].category}</span>
                  <span>•</span>
                  <span>{ARTICLES[0].date}</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold font-sans italic text-brand-ink leading-tight group-hover:text-brand-primary transition-colors">
                  {ARTICLES[0].title}
                </h2>
                <p className="text-sm text-brand-muted font-sans leading-relaxed">
                  {ARTICLES[0].subtitle}
                </p>
              </div>

              <div className="pt-6 border-t border-brand-line flex items-center justify-between text-xs text-brand-muted font-sans">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>{ARTICLES[0].author}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-brand-primary">
                  <span>읽기</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Article Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {ARTICLES.slice(1).map((article) => (
            <motion.div 
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedArticle(article)}
              className="bg-white rounded-3xl border border-brand-line overflow-hidden cursor-pointer group hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                  <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-4 left-4 bg-black/60 text-white text-[9px] font-bold font-sans tracking-widest px-3 py-1 rounded-full uppercase backdrop-blur-sm">
                    {article.category}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="text-[10px] text-brand-muted font-sans flex items-center gap-2">
                    <Calendar size={12} />
                    <span>{article.date}</span>
                    <span>•</span>
                    <Clock size={12} />
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="text-xl font-bold font-sans italic text-brand-ink leading-snug group-hover:text-brand-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-brand-muted font-sans leading-relaxed line-clamp-2">
                    {article.subtitle}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 flex items-center justify-between text-xs font-sans text-brand-muted border-t border-transparent">
                <span>{article.author}</span>
                <button 
                  onClick={(e) => handleLike(article.id, e)}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-500 transition-colors font-bold"
                >
                  <Heart size={14} className={likesMap[article.id] ? "fill-red-400" : ""} />
                  <span>{article.likes + (likesMap[article.id] || 0)}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-brand-line shadow-2xl relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => setSelectedArticle(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <X size={20} />
              </button>

              <div className="relative h-72 sm:h-96 w-full">
                <img 
                  src={selectedArticle.imageUrl} 
                  alt={selectedArticle.title} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8 sm:p-12 text-white">
                  <div className="space-y-2">
                    <span className="text-xs font-bold font-sans uppercase tracking-widest bg-brand-primary px-3 py-1 rounded-full">
                      {selectedArticle.category}
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-bold font-sans italic leading-tight">
                      {selectedArticle.title}
                    </h2>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-12 space-y-8">
                <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-brand-line text-xs text-brand-muted font-sans">
                  <div className="flex items-center gap-4">
                    <span>작성자: <strong>{selectedArticle.author}</strong></span>
                    <span>날짜: <strong>{selectedArticle.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleLike(selectedArticle.id, e)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 rounded-full font-bold hover:bg-red-100 transition-colors"
                    >
                      <Heart size={14} className={likesMap[selectedArticle.id] ? "fill-red-500" : ""} />
                      <span>좋아요 {selectedArticle.likes + (likesMap[selectedArticle.id] || 0)}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6 text-sm sm:text-base text-brand-ink font-sans leading-relaxed">
                  {selectedArticle.content.map((paragraph, idx) => (
                    <p key={idx} className="first-letter:text-3xl first-letter:font-serif first-letter:font-bold first-letter:mr-1">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="pt-8 border-t border-brand-line text-center">
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="px-8 py-3 bg-brand-primary text-white text-xs font-bold font-sans uppercase tracking-widest rounded-full hover:opacity-90 transition-opacity"
                  >
                    목록으로 돌아가기
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Magazine;
