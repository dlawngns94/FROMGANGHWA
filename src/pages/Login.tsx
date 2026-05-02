import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const GOOGLE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='48px' height='48px'%3E%3Cpath fill='%23FFC107' d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3Cpath fill='%23FF3D00' d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'/%3E%3Cpath fill='%234CAF50' d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'/%3E%3Cpath fill='%231976D2' d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3C/svg%3E";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Firebase Auth Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('브라우저에서 팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(
          `로그인 실패: 승인되지 않은 도메인입니다.\n` +
          `[Firebase에 등록할 주소]: ${window.location.hostname}\n\n` +
          `* 참고: 이 주소가 이미 등록되어 있다면, '새 비밀 탭'이나 '다른 브라우저'에서 테스트해보세요.`
        );
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
          <h1 className="text-3xl font-bold tracking-tighter text-brand-dark">프롬강화 시작하기</h1>
          <p className="text-[#8E9299] text-sm leading-relaxed">
            강화의 가치 있는 경험을 위해 <br />로그인하고 더 많은 혜택을 받아보세요.
          </p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group relative"
        >
          <img 
            src={GOOGLE_ICON} 
            alt="Google Logo" 
            className="w-6 h-6 object-contain" 
          />
          <span className="font-bold text-gray-700">Google로 계속하기</span>
        </button>

        {error && (
          <div className="space-y-2 p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs font-semibold text-red-600 leading-normal whitespace-pre-line">{error}</p>
            <p className="text-[10px] text-gray-400 cursor-pointer hover:underline" onClick={() => window.location.reload()}>
              * 설정 변경 후 반드시 <b>새로고침(F5)</b> 하세요.
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
