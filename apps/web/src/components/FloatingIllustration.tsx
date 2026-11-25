import React, { useEffect, useRef, useState } from 'react';

export type GlowVariant = 'emerald-blue' | 'emerald' | 'blue-cyan' | 'indigo-emerald' | 'none';

export interface FloatingIllustrationProps {
  src: string;
  alt: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  glowVariant?: GlowVariant;
  delayMs?: number;
  align?: 'left' | 'center' | 'right';
  maxWidthClass?: string;
  className?: string;
  width?: number;
  height?: number;
}

const GLOW_STYLES: Record<GlowVariant, string> = {
  'emerald-blue':
    'bg-[radial-gradient(circle_at_50%_50%,rgba(0,208,156,0.24)_0%,rgba(59,130,246,0.16)_45%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,208,156,0.28)_0%,rgba(59,130,246,0.20)_45%,transparent_74%)]',
  emerald:
    'bg-[radial-gradient(circle_at_50%_50%,rgba(0,208,156,0.22)_0%,rgba(16,185,129,0.14)_45%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,208,156,0.26)_0%,rgba(59,130,246,0.14)_48%,transparent_74%)]',
  'blue-cyan':
    'bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.20)_0%,rgba(0,208,156,0.18)_48%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.24)_0%,rgba(0,208,156,0.22)_48%,transparent_74%)]',
  'indigo-emerald':
    'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.18)_0%,rgba(0,208,156,0.18)_48%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.24)_0%,rgba(0,208,156,0.20)_48%,transparent_74%)]',
  none: 'hidden',
};

const ALIGN_CLASSES: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-center lg:justify-start',
  center: 'justify-center',
  right: 'justify-center lg:justify-end',
};

export const FloatingIllustration: React.FC<FloatingIllustrationProps> = ({
  src,
  alt,
  loading = 'lazy',
  fetchPriority = 'auto',
  glowVariant = 'emerald-blue',
  delayMs = 0,
  align = 'center',
  maxWidthClass = 'max-w-[540px] sm:max-w-[600px] lg:max-w-[660px]',
  className = '',
  width = 1254,
  height = 1254,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isLazy = loading === 'lazy';
  const [shouldLoad, setShouldLoad] = useState(!isLazy);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLazy) {
      setShouldLoad(true);
      return;
    }
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isLazy]);

  useEffect(() => {
    setIsLoaded(false);
    if (shouldLoad && imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src, shouldLoad]);

  return (
    <div
      ref={containerRef}
      className={`relative flex w-full items-center ${ALIGN_CLASSES[align]} ${className}`}
    >
      <div className={`relative w-full ${maxWidthClass} aspect-square flex items-center justify-center`}>
        {glowVariant !== 'none' && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-4 sm:inset-6 rounded-full blur-2xl sm:blur-3xl opacity-90 transition-opacity ${GLOW_STYLES[glowVariant]}`}
          />
        )}

        {!isLoaded && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-10 sm:inset-14 rounded-3xl bg-emerald-500/8 dark:bg-emerald-400/10 animate-pulse"
          />
        )}

        <div
          className="relative z-10 w-full h-full flex items-center justify-center animate-float-3d"
          style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
        >
          {shouldLoad && (
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              width={width}
              height={height}
              loading={loading}
              decoding="async"
              fetchPriority={fetchPriority}
              onLoad={() => setIsLoaded(true)}
              onError={() => setIsLoaded(true)}
              className={`w-full h-auto max-h-full object-contain select-none transition-opacity duration-500 drop-shadow-[0_18px_36px_rgba(15,42,31,0.14)] dark:drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)] ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
