import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2, HelpCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: '배송/상품',
    question: '제철 농산물(고구마, 섬쌀) 배송 기간은 얼마나 걸리나요?',
    answer: '평일 오후 2시 이전 주문건은 당일 산지 직송 발송됩니다. 보통 발송 다음 날(1~2일 이내) 신선한 상태로 배송받으실 수 있습니다.'
  },
  {
    category: '체험/예약',
    question: '이리저리 체험관 예약 취소 및 환불 규정은 어떻게 되나요?',
    answer: '체험 3일 전 100% 환불, 2일 전 70%, 1일 전 50% 환불이 가능하며, 당일 취소 및 노쇼(No-show)의 경우 환불이 불가합니다.'
  },
  {
    category: '자체브랜드',
    question: '대량 구매 또는 제휴/기업 선물 세트 문의는 어디로 하나요?',
    answer: '아래 1:1 문의 폼에서 [대량/제휴문의] 항목을 선택 후 내용을 남겨주시면, 담당자가 빠른 시일 내에 견서 및 세부 안내를 전달해 드립니다.'
  },
  {
    category: '스테이',
    question: '프롬강화 스테이 체크인/체크아웃 시간은 몇 시인가요?',
    answer: '체크인은 오후 3시부터이며, 체크아웃은 다음 날 오전 11시까지입니다. 입실 관련 상세 안내는 예약 당일 오전에 문자로 발송해 드립니다.'
  }
];

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: '상품문의',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message) {
      alert('이름과 문의 내용을 입력해 주세요.');
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-serif">
      {/* Header Banner */}
      <header className="py-16 sm:py-20 px-6 border-b border-brand-line text-center bg-white">
        <div className="max-w-4xl mx-auto space-y-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-muted font-sans font-bold flex items-center justify-center gap-1.5">
            <MessageSquare size={12} /> Contact & Support
          </span>
          <h1 className="text-4xl sm:text-6xl font-light italic">고객 문의</h1>
          <p className="text-sm sm:text-base text-brand-muted font-sans font-light max-w-xl mx-auto leading-relaxed">
            궁금하신 사항을 편하게 남겨주시면 정성을 다해 답변드리겠습니다.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 w-full space-y-16">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-line space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-line flex items-center justify-center text-brand-primary">
              <Clock size={18} />
            </div>
            <h3 className="font-sans font-bold text-lg text-brand-ink">운영시간 안내</h3>
            <p className="font-sans text-xs text-brand-muted leading-relaxed">
              월 - 금: 10:00 ~ 18:00<br />
              점심시간: 12:30 ~ 13:30<br />
              (토/일/공휴일 휴무)
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-line space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-line flex items-center justify-center text-brand-primary">
              <Phone size={18} />
            </div>
            <h3 className="font-sans font-bold text-lg text-brand-ink">직통 전화 & 카카오톡</h3>
            <p className="font-sans text-xs text-brand-muted leading-relaxed">
              고객센터: 032-930-1004<br />
              카카오톡 채널: @프롬강화<br />
              이메일: contact@fromganghwa.kr
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-brand-line space-y-3">
            <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-line flex items-center justify-center text-brand-primary">
              <MapPin size={18} />
            </div>
            <h3 className="font-sans font-bold text-lg text-brand-ink">오시는 길</h3>
            <p className="font-sans text-xs text-brand-muted leading-relaxed">
              인천광역시 강화군 강화읍 강화대로 100<br />
              프롬강화 로컬 플래그십 스페이스
            </p>
          </div>
        </div>

        {/* 1:1 Inquiry Form & FAQ Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* 1:1 Inquiry Form */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-brand-line space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-brand-muted">
                1:1 Inquiry
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-sans italic text-brand-ink">
                온라인 1:1 문의 작성
              </h2>
            </div>

            {isSubmitted ? (
              <div className="py-12 text-center space-y-4 font-sans">
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-brand-ink">문의가 성공적으로 접수되었습니다.</h3>
                <p className="text-xs text-brand-muted max-w-sm mx-auto leading-relaxed">
                  남겨주신 문의 내용은 담당자 확인 후 기재해주신 연락처/이메일로 신속히 답변 드리겠습니다.
                </p>
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({ name: '', phone: '', email: '', category: '상품문의', subject: '', message: '' });
                  }}
                  className="mt-4 px-6 py-2.5 bg-brand-primary text-white rounded-full text-xs font-bold uppercase tracking-wider"
                >
                  추가 문의 작성하기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">성함 *</label>
                    <input
                      type="text"
                      required
                      placeholder="홍길동"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">연락처</label>
                    <input
                      type="tel"
                      placeholder="010-0000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">이메일</label>
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-muted mb-1">문의 유형 *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                    >
                      <option value="상품문의">자체브랜드 / 상품 문의</option>
                      <option value="농산물문의">제철 농산물 배송 문의</option>
                      <option value="체험/예약문의">이리저리 체험관 / 스테이 예약 문의</option>
                      <option value="대량/제휴문의">대량 구매 및 입점/제휴 문의</option>
                      <option value="기타">기타 문의</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-muted mb-1">문의 제목</label>
                  <input
                    type="text"
                    placeholder="문의 제목을 입력해 주세요"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-muted mb-1">문의 내용 *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="상세한 문의 내용을 남겨주세요."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-brand-bg/50 border border-brand-line rounded-xl text-xs focus:outline-none focus:border-brand-primary resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-brand-primary text-white font-bold rounded-full text-xs uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>문의 제출하기</span>
                </button>
              </form>
            )}
          </div>

          {/* FAQ Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-brand-muted flex items-center gap-1.5">
                <HelpCircle size={12} /> FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-sans italic text-brand-ink">
                자주 묻는 질문
              </h2>
            </div>

            <div className="bg-white rounded-3xl border border-brand-line divide-y divide-brand-line overflow-hidden shadow-sm">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={idx} className="p-6 transition-colors">
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full text-left flex items-start justify-between gap-4 font-sans focus:outline-none"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block">
                          [{faq.category}]
                        </span>
                        <h4 className="text-sm font-bold text-brand-ink leading-snug">
                          Q. {faq.question}
                        </h4>
                      </div>
                      <span className="text-xl font-light text-brand-muted">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="mt-4 pt-4 border-t border-dashed border-brand-line text-xs font-sans text-brand-muted leading-relaxed">
                        A. {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
