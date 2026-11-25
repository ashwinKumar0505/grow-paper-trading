import React from 'react';

// Decorative SVG illustrations (no market data).

export function SearchIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="illus" aria-hidden="true">
      <defs>
        <linearGradient id="il-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="30" y="28" width="220" height="140" rx="16" style={{ fill: 'var(--surface-2)', stroke: 'var(--border)' }} />
      <rect x="48" y="44" width="70" height="8" rx="4" style={{ fill: 'var(--border-strong)' }} />
      <rect x="48" y="58" width="44" height="6" rx="3" style={{ fill: 'var(--border)' }} />
      <path d="M48 140 L80 122 L104 130 L134 100 L160 108 L196 74 L232 84 L232 156 L48 156 Z" fill="url(#il-area)" />
      <path d="M48 140 L80 122 L104 130 L134 100 L160 108 L196 74 L232 84" fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="196" cy="74" r="5" style={{ fill: 'var(--primary)' }} />
      <circle cx="232" cy="128" r="38" style={{ fill: 'var(--surface)', stroke: 'var(--primary)' }} strokeWidth="6" />
      <line x1="259" y1="156" x2="288" y2="185" style={{ stroke: 'var(--primary)' }} strokeWidth="10" strokeLinecap="round" />
      <path d="M214 136 L226 124 L236 132 L250 116" fill="none" style={{ stroke: 'var(--primary)' }} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HeroChartIllustration() {
  const pts = [
    [10, 150], [40, 132], [62, 138], [90, 110], [116, 118], [146, 88], [170, 96], [200, 64], [226, 74], [256, 40], [290, 22],
  ];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  return (
    <svg viewBox="0 0 300 170" className="hero-illus" aria-hidden="true">
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00d09c" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#00d09c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120].map((y) => (
        <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={`${d} L290,170 L10,170 Z`} fill="url(#hero-area)" />
      <path d={d} fill="none" stroke="#00d09c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="290" cy="22" r="6" fill="#00d09c" />
      <circle cx="290" cy="22" r="12" fill="#00d09c" opacity="0.2" />
    </svg>
  );
}
