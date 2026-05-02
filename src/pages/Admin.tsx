import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking } from '../types';
import { format } from 'date-fns';
import { Search, Filter, Check, X, Truck, Clock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Admin: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(data);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (id: string, newStatus: Booking['status']) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesType = filterType === 'all' || b.category === filterType;
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch = b.userName.includes(searchTerm) || b.phone.includes(searchTerm);
    return matchesType && matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: Booking['status']) => {
    switch (status) {
      case 'waiting_payment': return <Clock size={16} className="text-orange-400" />;
      case 'paid': return <CheckCircle size={16} className="text-blue-500" />;
      case 'confirmed': return <Check size={16} className="text-green-600" />;
      case 'shipped': return <Truck size={16} className="text-purple-500" />;
      case 'cancelled': return <X size={16} className="text-red-500" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'waiting_payment': return '결제전';
      case 'paid': return '입금확인필요';
      case 'confirmed': return '확정됨';
      case 'shipped': return '배송/완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const categoryLabels = {
    store: '특산물',
    farm: '체험',
    stay: '숙박'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold font-serif text-[#5A5A40]">관리자 대시보드</h1>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="예약자명, 연락처 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 w-full"
            />
          </div>
          
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            >
              <option value="all">전체 항목</option>
              <option value="store">특산물</option>
              <option value="farm">체험</option>
              <option value="stay">숙박</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm bg-transparent focus:outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="waiting_payment">결제전</option>
              <option value="paid">입금확인필요</option>
              <option value="confirmed">확정됨</option>
              <option value="shipped">배송중/완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100 italic font-serif text-sm opacity-60">
              <th className="px-6 py-4">예약번호</th>
              <th className="px-6 py-4">구분</th>
              <th className="px-6 py-4">예약자명</th>
              <th className="px-6 py-4">결제수단</th>
              <th className="px-6 py-4">예약/배송일자</th>
              <th className="px-6 py-4">상태</th>
              <th className="px-6 py-4">액션</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredBookings.map((b) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={b.id} 
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">#{b.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${
                        b.category === 'stay' ? 'border-purple-200 text-purple-600' : 
                        b.category === 'farm' ? 'border-orange-200 text-orange-600' : 
                        'border-green-200 text-green-600'
                      }`}>
                        {categoryLabels[b.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <div>{b.userName}</div>
                      <div className="text-[10px] text-gray-400 font-sans">{b.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-sans">
                      {b.paymentMethod === 'bank_transfer' ? '무통장' : b.paymentMethod === 'naver_pay' ? '네이버페이' : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium">{b.date}</div>
                      {b.time && <div className="text-xs text-gray-400">{b.time}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-sm font-medium">
                        {getStatusIcon(b.status)}
                        <span>{getStatusLabel(b.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {b.status === 'paid' && (
                          <button 
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors" title="입금확인 및 예약확정"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {b.status === 'waiting_payment' && (
                          <button 
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            className="p-1 hover:bg-green-50 text-green-600 rounded transition-colors" title="바로 확정"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        {b.category === 'store' && b.status === 'confirmed' && (
                          <button 
                            onClick={() => updateStatus(b.id, 'shipped')}
                            className="p-1 hover:bg-green-50 text-green-600 rounded transition-colors" title="배송"
                          >
                            <Truck size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => updateStatus(b.id, 'cancelled')}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors" title="취소"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredBookings.length === 0 && (
          <div className="py-20 text-center text-gray-400 italic">
            내역이 존재하지 않습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
