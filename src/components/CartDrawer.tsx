import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const CartDrawer: React.FC = () => {
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    totalPrice,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsCartOpen(false);
    if (!user) {
      navigate('/login');
      return;
    }
    // Navigate to booking page with mode=cart
    navigate('/booking?mode=cart');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-brand-line"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-brand-line flex items-center justify-between bg-brand-bg">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-brand-primary text-white rounded-xl shadow-xs">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-brand-ink">장바구니</h2>
                    <p className="text-xs text-brand-muted">
                      총 <span className="font-bold text-brand-primary">{totalCount}개</span>의 상품이 담겨있습니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {items.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      title="장바구니 비우기"
                    >
                      비우기
                    </button>
                  )}
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-gray-400 hover:text-brand-ink rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-gray-100">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16 text-brand-muted">
                    <div className="w-16 h-16 rounded-full bg-brand-bg flex items-center justify-center text-gray-300">
                      <ShoppingBag size={32} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-brand-ink">장바구니가 비어 있습니다.</p>
                      <p className="text-xs text-gray-400 mt-1">프롬강화의 제철 상품과 체험 상품을 담아보세요!</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        navigate('/store');
                      }}
                      className="px-6 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-all"
                    >
                      상품 보러가기
                    </button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="pt-4 first:pt-0 flex gap-4 items-center">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded-2xl border border-gray-100 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-brand-ink truncate">{item.name}</h4>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-brand-primary">
                          {item.price.toLocaleString()} KRW {item.unit && <span className="text-[10px] text-gray-400 font-normal">/ {item.unit}</span>}
                        </p>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="px-3 text-xs font-bold text-brand-ink min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-gray-200 text-gray-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <div className="text-xs font-bold text-brand-ink">
                            {(item.price * item.quantity).toLocaleString()} KRW
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              {items.length > 0 && (
                <div className="p-6 border-t border-brand-line bg-brand-bg space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-brand-muted">
                      <span>상품 금액</span>
                      <span>{totalPrice.toLocaleString()} KRW</span>
                    </div>
                    <div className="flex justify-between text-xs text-brand-muted">
                      <span>배송비 / 예약 수수료</span>
                      <span className="text-brand-primary font-bold">무료 (0 KRW)</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-brand-ink pt-2 border-t border-gray-200">
                      <span>총 결제예정금액</span>
                      <span className="text-xl text-brand-primary italic">
                        {totalPrice.toLocaleString()} KRW
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 hover:opacity-90 transition-all shadow-md"
                  >
                    <span>주문 및 결제하기</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
