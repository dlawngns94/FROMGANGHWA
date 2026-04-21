import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Ensure popup is allowed
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('브라우저에서 팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('현재 도메인이 Firebase 승인된 도메인에 등록되지 않았습니다. 관리자 설정을 확인해주세요.');
      } else {
        setError(`로그인 오류 (${err.code || 'unknown'}): ${err.message || '잠시 후 다시 시도해주세요.'}`);
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-12 rounded-[40px] shadow-2xl border border-[#5A5A40]/5 max-w-sm w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tighter">프롬강화 시작하기</h1>
          <p className="text-[#8E9299] text-sm leading-relaxed">
            강화의 가치 있는 경험을 위해 <br />로그인하고 더 많은 혜택을 받아보세요.
          </p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group relative"
        >
          <img 
            src="https://www.gstatic.com/images/branding/product/2x/google_64dp.png" 
            alt="Google Logo" 
            className="w-6 h-6 object-contain" 
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-gray-700">Google로 계속하기</span>
        </button>

        {error && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-500 leading-snug">{error}</p>
            <p className="text-[10px] text-brand-muted">
              * 오류 해결이 안 될 경우 브라우저를 <b>새로고침(F5)</b> 해주세요.
            </p>
          </div>
        )}

        <p className="text-[10px] text-[#C0C0C0] uppercase tracking-widest leading-loose">
          By continuing, you agree to from ganghwa's <br />
          terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
