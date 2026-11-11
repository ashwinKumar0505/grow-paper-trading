import React from 'react';

interface LogoProps {
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
}

export const GrowwLogo: React.FC<LogoProps> = ({
  className = 'h-8',
  showBadge = true,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none transition-transform active:scale-[0.98] ${
        onClick ? 'cursor-pointer hover:opacity-95' : ''
      } ${className}`}
    >
      {/* My Paper Trade Bull & Upward Arrow Logo Mark */}
      <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 drop-shadow-xs"
        >
          {/* Obsidian Squircle Container */}
          <rect
            width="40"
            height="40"
            rx="10"
            fill="#0F141F"
            stroke="#1F293D"
            strokeWidth="1.2"
          />

          {/* Stylized Bull Horns in Emerald Green */}
          {/* Left Horn curving up */}
          <path
            d="M 17 16 C 14 13 11 9 8 7 C 11 9 14 12 17 14 Z"
            fill="#00D09C"
          />
          {/* Right Horn curving up */}
          <path
            d="M 23 16 C 26 13 29 9 32 7 C 29 9 26 12 23 14 Z"
            fill="#00D09C"
          />

          {/* Bull Forehead & Face Plate (Clean White Silhouette) */}
          <path
            d="M 14 15 L 26 15 L 24 23 L 20 27 L 16 23 Z"
            fill="#FFFFFF"
          />

          {/* Bull Eyes (Angular facets) */}
          <path
            d="M 16 18 L 19 19 L 17 21 Z"
            fill="#0F141F"
          />
          <path
            d="M 24 18 L 21 19 L 23 21 Z"
            fill="#0F141F"
          />

          {/* Bull Muzzle / Snout */}
          <path
            d="M 18 24 L 22 24 L 20 27 Z"
            fill="#00D09C"
          />

          {/* Bull Nose Ring */}
          <path
            d="M 18.5 27 C 18.5 28.5 21.5 28.5 21.5 27"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Dynamic Upward Breakout Trend Arrow */}
          <path
            d="M 7 32 L 14 26 L 19 29 L 32 14"
            stroke="#00D09C"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Arrowhead */}
          <path
            d="M 26 14 L 32 14 L 32 20"
            stroke="#00D09C"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex items-center gap-2">
        <span className="font-extrabold text-xl tracking-tight text-[#1E2229] dark:text-white font-sans">
          My Paper <span className="text-[#00D09C]">Trade</span>
        </span>
      </div>
    </div>
  );
};

// Also export as MyPaperTradeLogo
export const MyPaperTradeLogo = GrowwLogo;
