import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'stacked' | 'horizontal';
  showText?: boolean;
}

export const BlueRibbonIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
  <svg 
    viewBox="0 0 100 50" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    {/* Delicate Hand-drawn Blue Ribbon Bow */}
    <path
      d="M 50,22 
         C 42,10 20,8 20,20 
         C 20,30 40,24 50,22 
         C 60,24 80,30 80,20 
         C 80,8 58,10 50,22 Z"
      stroke="#2053B8"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ribbon Left Tail */}
    <path
      d="M 48,22 C 42,30 35,38 32,46"
      stroke="#2053B8"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    {/* Ribbon Right Tail */}
    <path
      d="M 52,22 C 58,30 65,36 72,42"
      stroke="#2053B8"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </svg>
);

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  showText = true,
}) => {
  const sizeClasses = {
    sm: { icon: 'w-7 h-5', text: 'text-base', gap: 'gap-1.5' },
    md: { icon: 'w-9 h-7', text: 'text-xl', gap: 'gap-2' },
    lg: { icon: 'w-12 h-9', text: 'text-2xl', gap: 'gap-2.5' },
    xl: { icon: 'w-20 h-14', text: 'text-3xl', gap: 'gap-3' },
  }[size];

  if (variant === 'stacked') {
    return (
      <Link to="/" className={`flex flex-col items-center group font-serif ${className}`}>
        <BlueRibbonIcon className={`${sizeClasses.icon} transition-transform group-hover:scale-105`} />
        {showText && (
          <span className={`${sizeClasses.text} font-medium tracking-tight text-brand-ink transition-colors group-hover:text-brand-primary mt-0.5`}>
            프롬강화
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link to="/" className={`flex items-center ${sizeClasses.gap} group font-serif ${className}`}>
      <BlueRibbonIcon className={`${sizeClasses.icon} transition-transform group-hover:scale-105 shrink-0`} />
      {showText && (
        <span className={`${sizeClasses.text} font-medium tracking-tight text-brand-ink transition-colors group-hover:text-brand-primary whitespace-nowrap`}>
          프롬강화
        </span>
      )}
    </Link>
  );
};
