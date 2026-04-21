import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { STORE_ITEMS, FARM_ITEMS, STAY_ITEMS } from '../constants';
import { Booking } from '../types';
import { format } from 'date-fns';
import { ShoppingBag, Calendar as CalendarIcon, Clock, User, Phone, MapPin, CreditCard, CheckCircle } from 'lucide-react';

const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const type = searchParams.get('type') as 'store' | 'farm' | 'stay';
  const productId = searchParams.get('id');

  const allItems = [...STORE_ITEMS, ...FARM_ITEMS, ...STAY_ITEMS];
  const selectedProduct = allItems.find(p => p.id === productId);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      userName: profile?.displayName || '',
      phone: '',
      address: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      quantity: 1,
    }
  });

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const quantity = watch('quantity');

  const onSubmit = async (data: any) => {
    if (!user || !selectedProduct) return;
    setIsSubmitting(true);
    
    try {
      const booking: Partial<Booking> = {
        userId: user.uid,
        category: type,
        items: [{
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: Number(data.quantity),
          price: selectedProduct.price,
        }],
        totalPrice: selectedProduct.price * Number(data.quantity),
        date: data.date,
        time: data.time,
        userName: data.userName,
        phone: data.phone,
        address: data.address,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), booking);
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('예약 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-green-100 p-4 rounded-full text-green-600">
            <CheckCircle size={64} />
          </div>
        </div>
        <h1 className="text-3xl font-bold">예약/주문이 완료되었습니다!</h1>
        <p className="text-[#8E9299]">관리자가 확인 후 곧 연락드리겠습니다.</p>
        <button 
          onClick={() => navigate('/')}
          className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (!selectedProduct) return <div className="py-20 text-center">상품 정보를 찾을 수 없습니다.</div>;

  return (
    <div className="min-h-screen bg-white">
      <header className="py-20 px-10 text-center border-b border-brand-line">
        <h1 className="text-5xl font-light italic mb-4">예약 및 주문하기</h1>
        <p className="text-brand-muted uppercase tracking-[0.3em] text-[10px] font-sans font-bold">Experience Reservation Service</p>
      </header>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row">
        {/* Summary Side */}
        <div className="w-full md:w-[40%] p-10 border-brand-line md:border-r space-y-8 bg-brand-bg">
          <div className="aspect-[4/3] overflow-hidden">
            <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold italic">{type === 'store' ? 'Local Specialty' : type === 'farm' ? 'Seasonal Farm' : 'Premium Stay'}</div>
            <h2 className="text-4xl font-light italic">{selectedProduct.name}</h2>
            <p className="text-brand-muted text-sm leading-relaxed font-sans font-light">{selectedProduct.description}</p>
          </div>
          
          <div className="pt-8 border-t border-brand-line flex justify-between items-baseline">
            <span className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">Total Amount</span>
            <span className="text-3xl font-bold italic tracking-tighter">{(selectedProduct.price * quantity).toLocaleString()} KRW</span>
          </div>
          
          {/* Naver Pay Button */}
          <div className="pt-4">
            <div className="bg-naver-pay text-white p-4 rounded-lg flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity">
              <div className="flex items-center space-x-2">
                <CreditCard size={18} />
                <span className="font-bold text-sm">N Pay 결제하기</span>
              </div>
              <span className="text-[10px] opacity-80 font-bold">최대 5% 적립</span>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full md:w-[60%] p-10 md:p-16 space-y-12 bg-white">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary italic font-bold">01</span>
              <h3 className="text-2xl font-light italic uppercase tracking-wider">주문자 정보</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">성함 / Name</label>
                <input 
                  {...register('userName', { required: true })} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent placeholder:opacity-30" 
                  placeholder="예약자 성함을 입력해주세요."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">연락처 / Contact</label>
                <input 
                  {...register('phone', { required: true, pattern: /^\d{3}-\d{3,4}-\d{4}$/ })} 
                  placeholder="010-0000-0000"
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent" 
                />
                {errors.phone && <p className="text-[10px] text-red-400 mt-1 uppercase font-bold tracking-tighter">Please check phone format</p>}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary italic font-bold">02</span>
              <h3 className="text-2xl font-light italic uppercase tracking-wider">상세 옵션</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">
                  {type === 'store' ? '수량 / Quantity' : type === 'farm' ? '인원 / People' : '박수 / Nights'}
                </label>
                <input 
                  type="number" 
                  min="1"
                  {...register('quantity', { required: true, min: 1 })} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent" 
                />
              </div>
              
              {(type === 'farm' || type === 'stay') && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">날짜 / Date</label>
                  <input 
                    type="date"
                    {...register('date', { required: true })} 
                    className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent" 
                  />
                </div>
              )}
            </div>

            {type === 'farm' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">체험 시간 / Time Slot</label>
                <select 
                  {...register('time')} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent"
                >
                  <option value="10:00">10:00 AM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                </select>
              </div>
            )}

            {type === 'store' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted font-sans">배송 주소 / Delivery Address</label>
                <textarea 
                  {...register('address', { required: type === 'store' })} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent h-24 resize-none"
                  placeholder="정확한 배송지를 입력해주세요."
                />
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-primary text-white py-5 rounded-full font-bold text-xs tracking-[0.3em] uppercase hover:opacity-90 transition-all disabled:opacity-50 mt-12"
          >
            {isSubmitting ? 'Processing...' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
