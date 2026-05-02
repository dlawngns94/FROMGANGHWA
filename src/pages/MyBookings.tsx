import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { Booking } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, CheckCircle, Clock, XCircle, ChevronRight, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const MyBookings: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePaymentSubmit = async (bookingId: string, method: string) => {
    setIsProcessing(true);
    
    // Simulate payment gateway processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'paid',
        paymentMethod: method,
        paidAt: serverTimestamp()
      });
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusInfo = (status: Booking['status']) => {
    switch (status) {
      case 'waiting_payment':
        return { label: '결제 대기', color: 'text-orange-500', icon: Wallet };
      case 'paid':
        return { label: '결제 완료(확인중)', color: 'text-blue-500', icon: Clock };
      case 'confirmed':
        return { label: '예약 확정', color: 'text-green-600', icon: CheckCircle };
      case 'cancelled':
        return { label: '예약 취소', color: 'text-red-500', icon: XCircle };
      case 'shipped':
        return { label: '배송중', color: 'text-purple-500', icon: CheckCircle };
      default:
        return { label: status, color: 'text-gray-500', icon: Clock };
    }
  };

  if (loading) return <div className="py-20 text-center font-sans uppercase tracking-[0.3em] opacity-30">Loading Bookings...</div>;

  return (
    <div className="min-h-screen bg-brand-bg py-20 px-6">
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-12 max-w-sm w-full text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-brand-bg border-t-[#03C75A] rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[#03C75A] font-bold text-xs">N Pay</span>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold font-sans">결제 진행 중</h3>
                <p className="text-sm text-brand-muted font-sans">네이버페이 결제 정보를 확인하고 있습니다.<br/>잠시만 기다려 주세요.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <h1 className="text-4xl font-light italic">내 예약 현황</h1>
          <p className="text-[10px] uppercase tracking-widest text-brand-muted font-sans font-bold">My Reservations & Orders</p>
        </header>

        <div className="space-y-6">
          {bookings.length === 0 ? (
            <div className="bg-white p-20 rounded-3xl text-center border border-brand-line">
              <ShoppingBag className="mx-auto mb-6 opacity-10" size={64} />
              <p className="text-brand-muted font-sans font-medium">예약 내역이 없습니다.</p>
            </div>
          ) : (
            bookings.map((booking) => {
              const status = getStatusInfo(booking.status);
              const StatusIcon = status.icon;

              return (
                <motion.div 
                  key={booking.id}
                  layout
                  className="bg-white rounded-3xl border border-brand-line overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 ${status.color} font-sans font-bold text-[10px] uppercase tracking-widest`}>
                          <StatusIcon size={14} />
                          {status.label}
                        </div>
                        <span className="text-[10px] text-brand-muted font-sans italic opacity-50">
                          {booking.createdAt?.toDate ? format(booking.createdAt.toDate(), 'yyyy.MM.dd') : 'Recently'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-xl font-bold font-sans italic">{booking.items[0].productName}</h3>
                        <p className="text-brand-muted text-xs font-sans">
                          {booking.category.toUpperCase()} • {booking.totalPrice.toLocaleString()} KRW
                        </p>
                      </div>

                      {booking.status === 'waiting_payment' && (
                        <button 
                          onClick={() => setSelectedBooking(booking.id)}
                          className="flex items-center gap-2 text-brand-primary font-sans font-bold text-[10px] uppercase tracking-widest hover:gap-3 transition-all"
                        >
                          결제 수단 선택하기 <ChevronRight size={14} />
                        </button>
                      )}
                    </div>

                    <div className="w-full md:w-auto flex md:flex-col gap-2">
                      <div className="px-4 py-2 bg-brand-bg rounded-lg text-center flex-1">
                        <div className="text-[8px] uppercase tracking-tighter text-brand-muted font-bold">Qty</div>
                        <div className="text-lg font-bold italic">{booking.items[0].quantity}</div>
                      </div>
                      {booking.date && (
                        <div className="px-4 py-2 bg-brand-bg rounded-lg text-center flex-1">
                          <div className="text-[8px] uppercase tracking-tighter text-brand-muted font-bold">Date</div>
                          <div className="text-sm font-bold italic">{booking.date}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedBooking === booking.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-brand-line bg-brand-bg/50 p-8 space-y-6"
                      >
                        <h4 className="text-sm font-bold font-sans uppercase tracking-widest">결제 수단 선택</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button 
                            onClick={() => handlePaymentSubmit(booking.id, 'bank_transfer')}
                            className="bg-white border border-brand-line p-6 rounded-2xl flex flex-col items-center gap-3 hover:border-brand-primary transition-colors group"
                          >
                            <Wallet className="text-brand-muted group-hover:text-brand-primary transition-colors" size={32} />
                            <span className="text-xs font-bold font-sans">무통장 입금</span>
                            <span className="text-[9px] text-brand-muted font-sans opacity-60">기업은행 012-345-67890 (프롬강화)</span>
                          </button>
                          <button 
                            onClick={() => handlePaymentSubmit(booking.id, 'naver_pay')}
                            className="bg-white border border-brand-line p-6 rounded-2xl flex flex-col items-center gap-3 hover:border-[#03C75A] transition-colors group"
                          >
                            <CreditCard className="text-brand-muted group-hover:text-[#03C75A] transition-colors" size={32} />
                            <span className="text-xs font-bold font-sans">네이버페이 결제</span>
                            <span className="text-[9px] text-brand-muted font-sans opacity-60">N Pay로 간편하게 결제하세요</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBookings;
