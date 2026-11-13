import React from 'react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<LogoProps> = ({
  className = 'h-8',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none transition-transform active:scale-[0.98] ${
        onClick ? 'cursor-pointer hover:opacity-95' : ''
      } ${className}`}
    >
      {/* NiftyLens Custom Chart-in-Lens Icon */}
      <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-9 h-9 drop-shadow-xs"
        >
          <defs>
            <linearGradient id="niftylensBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#082219" />
              <stop offset="100%" stopColor="#0D3528" />
            </linearGradient>
            <linearGradient id="niftylensGlow" x1="6" y1="8" x2="34" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00E6A8" />
              <stop offset="100%" stopColor="#00B386" />
            </linearGradient>
          </defs>

          {/* Deep Emerald Squircle Base */}
          <rect
            width="40"
            height="40"
            rx="11"
            fill="url(#niftylensBg)"
            stroke="#1B4D3B"
            strokeWidth="1.2"
          />

          {/* Rising Candlestick Bars inside the Lens */}
          {/* Bar 1 */}
          <line x1="12" y1="21" x2="12" y2="28" stroke="#00D09C" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
          <rect x="10.5" y="23" width="3" height="3.5" rx="0.8" fill="#00D09C" opacity="0.65" />

          {/* Bar 2 */}
          <line x1="17.5" y1="16.5" x2="17.5" y2="26" stroke="#00D09C" strokeWidth="1.3" strokeLinecap="round" opacity="0.85" />
          <rect x="16" y="18.5" width="3" height="5.5" rx="0.8" fill="#00D09C" opacity="0.85" />

          {/* Bar 3 */}
          <line x1="23" y1="12" x2="23" y2="23.5" stroke="#00E6A8" strokeWidth="1.4" strokeLinecap="round" />
          <rect x="21.5" y="14" width="3" height="7" rx="0.8" fill="#00E6A8" />

          {/* Dynamic Breakout Trend Curve */}
          <path
            d="M 9.5 26.5 L 15 22 L 19.5 23.5 L 27.5 13.5"
            stroke="#FFFFFF"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="27.5" cy="13.5" r="2.2" fill="#00E6A8" stroke="#FFFFFF" strokeWidth="1" />

          {/* Optical Lens Ring & Handle */}
          <circle
            cx="19"
            cy="19"
            r="11.5"
            stroke="url(#niftylensGlow)"
            strokeWidth="2.2"
          />
          <path
            d="M 27.5 27.5 L 33.5 33.5"
            stroke="url(#niftylensGlow)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* NiftyLens Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#15241D] dark:text-white font-sans">
          Nifty<span className="text-[#00B386] dark:text-[#00D09C]">Lens</span>
        </span>
      </div>
    </div>
  );
};
