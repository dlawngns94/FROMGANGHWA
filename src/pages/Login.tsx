import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';

const GOOGLE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' width='48px' height='48px'%3E%3Cpath fill='%23FFC107' d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3Cpath fill='%23FF3D00' d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'/%3E%3Cpath fill='%234CAF50' d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'/%3E%3Cpath fill='%231976D2' d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'/%3E%3C/svg%3E";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithSocial } = useAuth();
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

  const handleKakaoLogin = async () => {
    setError(null);
    try {
      await loginWithSocial('kakao', '카카오 회원');
      navigate('/');
    } catch (err: any) {
      console.error('Kakao Auth Error:', err);
      setError(`카카오 로그인 오류: ${err.message || '잠시 후 다시 시도해주세요.'}`);
    }
  };

  const handleNaverLogin = async () => {
    setError(null);
    try {
      await loginWithSocial('naver', '네이버 회원');
      navigate('/');
    } catch (err: any) {
      console.error('Naver Auth Error:', err);
      setError(`네이버 로그인 오류: ${err.message || '잠시 후 다시 시도해주세요.'}`);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 sm:p-12 rounded-[40px] shadow-2xl border border-brand-line max-w-sm w-full text-center space-y-8"
      >
        <div className="space-y-3">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-brand-muted">Welcome to Ganghwa</span>
          <h1 className="text-3xl font-bold tracking-tight font-sans italic text-brand-ink">프롬강화 시작하기</h1>
          <p className="text-brand-muted text-xs leading-relaxed font-sans font-light">
            강화의 가치 있는 경험을 위해 <br />로그인하고 더 많은 혜택을 받아보세요.
          </p>
        </div>

        <div className="space-y-3 font-sans">
          {/* Kakao Login Button */}
          <button 
            onClick={handleKakaoLogin}
            className="w-full flex items-center justify-center space-x-3 bg-[#FEE500] hover:bg-[#FADA00] text-[#191919] p-3.5 rounded-2xl transition-all shadow-sm font-bold text-xs"
          >
            <svg className="w-5 h-5 fill-current text-[#191919]" viewBox="0 0 24 24">
              <path d="M12 3C6.477 3 2 6.477 2 10.765c0 2.766 1.83 5.19 4.605 6.602l-1.17 4.305c-.105.385.328.705.67.478l5.143-3.411c.25.018.502.026.752.026 5.523 0 10-3.477 10-7.765C22 6.477 17.523 3 12 3z"/>
            </svg>
            <span>카카오로 시작하기</span>
          </button>

          {/* Naver Login Button */}
          <button 
            onClick={handleNaverLogin}
            className="w-full flex items-center justify-center space-x-3 bg-[#03C75A] hover:bg-[#02b350] text-white p-3.5 rounded-2xl transition-all shadow-sm font-bold text-xs"
          >
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M16.273 12.845L7.376 0H0v24h7.727v-12.845L16.624 24H24V0h-7.727v12.845z"/>
            </svg>
            <span>네이버로 시작하기</span>
          </button>

          {/* Google Login Button */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 p-3.5 rounded-2xl hover:bg-gray-50 transition-all shadow-sm font-bold text-xs text-gray-700"
          >
            <img 
              src={GOOGLE_ICON} 
              alt="Google Logo" 
              className="w-5 h-5 object-contain" 
            />
            <span>Google로 시작하기</span>
          </button>
        </div>

        {error && (
          <div className="space-y-2 p-4 bg-red-50 rounded-xl border border-red-100 font-sans">
            <p className="text-xs font-semibold text-red-600 leading-normal whitespace-pre-line">{error}</p>
            <p className="text-[10px] text-gray-400 cursor-pointer hover:underline" onClick={() => window.location.reload()}>
              * 설정 변경 후 반드시 <b>새로고침(F5)</b> 하세요.
            </p>
          </div>
        )}

        <p className="text-[10px] text-brand-muted uppercase tracking-widest leading-loose font-sans">
          By continuing, you agree to from ganghwa's <br />
          terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
