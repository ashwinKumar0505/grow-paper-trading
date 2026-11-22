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
      className={`flex items-center gap-2 sm:gap-2.5 select-none transition-transform active:scale-[0.98] ${
        onClick ? 'cursor-pointer hover:opacity-95' : ''
      } ${className}`}
    >
      {/* Tradedia app icon (downscaled from public/images/landing/logo.png) */}
      <img
        src="/images/landing/logo-96.png"
        alt=""
        aria-hidden="true"
        width={36}
        height={36}
        decoding="async"
        className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 object-contain drop-shadow-xs"
      />

      {/* Tradedia Wordmark */}
      <div className="flex items-center gap-1.5">
        <span className="font-extrabold text-base sm:text-xl tracking-tight whitespace-nowrap text-[#15241D] dark:text-white font-sans">
          Tradedia
        </span>
      </div>
    </div>
  );
};
