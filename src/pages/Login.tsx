import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError('로그인 중 오류가 발생했습니다.');
      console.error(err);
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
            강화도의 소중한 경험을 위해 <br />로그인하고 더 많은 혜택을 받아보세요.
          </p>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 p-4 rounded-2xl hover:bg-gray-50 transition-all shadow-sm group"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.png" alt="Google" className="w-5 h-5" />
          <span className="font-bold text-gray-700">Google로 계속하기</span>
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#5A5A40]/10 rounded-2xl transition-all" />
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-[10px] text-[#C0C0C0] uppercase tracking-widest leading-loose">
          By continuing, you agree to from ganghwa's <br />
          terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
