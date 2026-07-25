import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { STORE_ITEMS, FARM_ITEMS, STAY_ITEMS } from '../constants';
import { Booking } from '../types';
import { format } from 'date-fns';
import { ShoppingBag, Calendar as CalendarIcon, Clock, User, Phone, MapPin, CreditCard, CheckCircle, ShoppingCart } from 'lucide-react';

const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const mode = searchParams.get('mode'); // 'cart' or null
  const type = searchParams.get('type') as 'store' | 'farm' | 'stay';
  const productId = searchParams.get('id');

  const allItems = [...STORE_ITEMS, ...FARM_ITEMS, ...STAY_ITEMS];
  const selectedProduct = allItems.find(p => p.id === productId);

  const isCartMode = mode === 'cart';

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      userName: profile?.displayName || user?.displayName || '',
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

  const singleQuantity = watch('quantity');

  const computedTotalPrice = isCartMode 
    ? cartTotalPrice 
    : (selectedProduct ? selectedProduct.price * Number(singleQuantity || 1) : 0);

  const onSubmit = async (data: any) => {
    if (!user) return;
    if (!isCartMode && !selectedProduct) return;
    if (isCartMode && cartItems.length === 0) return;

    setIsSubmitting(true);
    
    try {
      const orderItems = isCartMode
        ? cartItems.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
          }))
        : [
            {
              productId: selectedProduct!.id,
              productName: selectedProduct!.name,
              quantity: Number(data.quantity),
              price: selectedProduct!.price,
            },
          ];

      const categoryType = isCartMode ? 'store' : (type || 'store');

      const booking: Partial<Booking> = {
        userId: user.uid,
        category: categoryType,
        items: orderItems,
        totalPrice: computedTotalPrice,
        date: data.date,
        time: data.time,
        userName: data.userName,
        phone: data.phone,
        address: data.address,
        status: 'waiting_payment',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'bookings'), booking);
      if (isCartMode) {
        clearCart();
      }
      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('예약/주문 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-6 font-sans">
        <div className="flex justify-center">
          <div className="bg-green-100 p-4 rounded-full text-green-600">
            <CheckCircle size={64} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-brand-ink">주문/예약 정보가 접수되었습니다!</h1>
        <p className="text-brand-muted font-sans text-sm leading-relaxed">
          [내 예약] 메뉴에서 결제 진행 상황을 확인하실 수 있습니다.<br/>
          결제 확인 후 관리자가 승인을 진행합니다.
        </p>
        <button 
          onClick={() => navigate('/my-bookings')}
          className="w-full bg-brand-primary text-white py-4 rounded-xl font-bold font-sans uppercase tracking-widest text-xs shadow-md hover:opacity-90 transition-all"
        >
          내 예약 확인하러 가기
        </button>
      </div>
    );
  }

  if (isCartMode && cartItems.length === 0) {
    return (
      <div className="py-32 text-center space-y-4 font-sans">
        <p className="text-gray-500">장바구니가 비어 있습니다.</p>
        <button
          onClick={() => navigate('/store')}
          className="px-6 py-2 bg-brand-primary text-white text-xs font-bold rounded-full"
        >
          제철상품 보러가기
        </button>
      </div>
    );
  }

  if (!isCartMode && !selectedProduct) {
    return <div className="py-20 text-center font-sans">상품 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="py-16 sm:py-20 px-6 text-center border-b border-brand-line">
        <h1 className="text-4xl sm:text-5xl font-light italic mb-2">
          {isCartMode ? '장바구니 통합 주문결제' : '예약 및 주문하기'}
        </h1>
        <p className="text-brand-muted uppercase tracking-[0.3em] text-[10px] font-sans font-bold">
          {isCartMode ? 'Cart Checkout' : 'Experience Reservation Service'}
        </p>
      </header>
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row">
        {/* Summary Side */}
        <div className="w-full md:w-[40%] p-8 sm:p-10 border-brand-line md:border-r space-y-8 bg-brand-bg">
          {isCartMode ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 text-brand-primary font-bold text-xs font-sans">
                <ShoppingCart size={18} />
                <span>장바구니 담긴 상품 ({cartItems.length}개)</span>
              </div>
              <div className="divide-y divide-gray-200/60 max-h-96 overflow-y-auto pr-2">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-3 flex items-center space-x-3">
                    <img src={item.imageUrl} alt={item.name} className="w-14 h-14 object-cover rounded-xl shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0 font-sans">
                      <p className="text-xs font-bold text-brand-ink truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-500">{item.price.toLocaleString()} KRW x {item.quantity}개</p>
                    </div>
                    <span className="text-xs font-bold text-brand-ink italic shrink-0">
                      {(item.price * item.quantity).toLocaleString()} KRW
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                <img src={selectedProduct!.imageUrl} alt={selectedProduct!.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-4 font-sans">
                <div className="text-[10px] uppercase tracking-widest text-brand-muted font-bold italic">
                  {type === 'store' ? 'Local Specialty' : type === 'farm' ? 'Seasonal Farm' : 'Premium Stay'}
                </div>
                <h2 className="text-3xl font-light italic text-brand-ink">{selectedProduct!.name}</h2>
                <p className="text-brand-muted text-xs leading-relaxed font-light">{selectedProduct!.description}</p>
              </div>
            </>
          )}
          
          <div className="pt-8 border-t border-brand-line flex justify-between items-baseline font-sans">
            <span className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">Total Amount</span>
            <span className="text-3xl font-bold italic tracking-tight text-brand-primary">
              {computedTotalPrice.toLocaleString()} KRW
            </span>
          </div>
        </div>

        {/* Form Side */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full md:w-[60%] p-8 sm:p-12 md:p-16 space-y-10 bg-white font-sans">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary italic font-bold">01</span>
              <h3 className="text-2xl font-light italic uppercase tracking-wider">주문자 정보</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">성함 / Name</label>
                <input 
                  {...register('userName', { required: true })} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent placeholder:opacity-30 text-sm" 
                  placeholder="예약자/주문자 성함"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">연락처 / Contact</label>
                <input 
                  {...register('phone', { required: true, pattern: /^\d{3}-\d{3,4}-\d{4}$/ })} 
                  placeholder="010-0000-0000"
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent text-sm" 
                />
                {errors.phone && <p className="text-[10px] text-red-400 mt-1 uppercase font-bold tracking-tighter">연락처 형식을 확인해 주세요.</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary italic font-bold">02</span>
              <h3 className="text-2xl font-light italic uppercase tracking-wider">상세 옵션 및 배송지</h3>
            </div>
            
            {!isCartMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">
                    {type === 'store' ? '수량 / Quantity' : type === 'farm' ? '인원 / People' : '박수 / Nights'}
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    {...register('quantity', { required: true, min: 1 })} 
                    className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent text-sm" 
                  />
                </div>
                
                {(type === 'farm' || type === 'stay') && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">날짜 / Date</label>
                    <input 
                      type="date"
                      {...register('date', { required: true })} 
                      className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent text-sm" 
                    />
                  </div>
                )}
              </div>
            )}

            {!isCartMode && type === 'farm' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">체험 시간 / Time Slot</label>
                <select 
                  {...register('time')} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent text-sm"
                >
                  <option value="10:00">10:00 AM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                </select>
              </div>
            )}

            {(isCartMode || type === 'store') && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">배송 주소 / Delivery Address</label>
                <textarea 
                  {...register('address', { required: true })} 
                  className="w-full py-3 border-b border-brand-line focus:border-brand-primary outline-none transition-colors bg-transparent h-24 resize-none text-sm"
                  placeholder="정확한 배송지 주소 및 수령인명을 입력해주세요."
                />
              </div>
            )}
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-primary text-white py-5 rounded-full font-bold text-xs tracking-[0.3em] uppercase hover:opacity-90 transition-all disabled:opacity-50 mt-8 shadow-md"
          >
            {isSubmitting ? '주문 접수 중...' : '주문 및 결제 신청 완료'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookingPage;
