import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export const AuthGateIllustration: React.FC = () => {
  return (
    <div className="relative rounded-2xl border border-[#1D3A2D] bg-gradient-to-br from-[#0C1D16] via-[#122B21] to-[#0A1812] p-6 text-white overflow-hidden shadow-inner">
      <div className="flex items-center justify-between text-xs text-[#9AB0A5] mb-4">
        <span className="inline-flex items-center gap-1.5 font-bold text-[#00D09C]">
          <ShieldCheck className="w-4 h-4" />
          Nifty Lens Member Workspace
        </span>
        <span className="rounded-md bg-[#00D09C]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00D09C]">
          NSE · NIFTY 500
        </span>
      </div>

      {/* Vector Illustration of Chart Analysis, Backtest Signals & Lens */}
      <svg
        viewBox="0 0 360 230"
        className="w-full h-auto rounded-xl bg-[#091510] border border-[#1D3A2D] p-3"
        role="img"
        aria-label="Nifty Lens Screener, Paper Trading and Chart Analysis Illustration"
      >
        <defs>
          <linearGradient id="authAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00D09C" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00D09C" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle Chart Grid */}
        <g stroke="#183126" strokeDasharray="3 3" strokeWidth="1">
          <line x1="16" y1="45" x2="344" y2="45" />
          <line x1="16" y1="95" x2="344" y2="95" />
          <line x1="16" y1="145" x2="344" y2="145" />
          <line x1="16" y1="195" x2="344" y2="195" />
        </g>

        {/* Area + Trendline */}
        <path
          d="M 24 175 L 70 152 L 112 162 L 158 122 L 200 132 L 248 84 L 296 64 L 332 42 L 332 205 L 24 205 Z"
          fill="url(#authAreaGrad)"
        />
        <path
          d="M 24 175 L 70 152 L 112 162 L 158 122 L 200 132 L 248 84 L 296 64 L 332 42"
          fill="none"
          stroke="#00D09C"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Candlesticks */}
        {[
          { x: 45, top: 142, bot: 178, o: 168, c: 150, up: true },
          { x: 88, top: 146, bot: 174, o: 152, c: 165, up: false },
          { x: 132, top: 118, bot: 158, o: 148, c: 126, up: true },
          { x: 176, top: 115, bot: 145, o: 124, c: 134, up: false },
          { x: 222, top: 78, bot: 124, o: 116, c: 86, up: true },
          { x: 268, top: 58, bot: 96, o: 84, c: 66, up: true },
          { x: 314, top: 34, bot: 74, o: 64, c: 44, up: true },
        ].map((bar, i) => {
          const color = bar.up ? '#00D09C' : '#F0614A';
          const y = Math.min(bar.o, bar.c);
          const h = Math.max(6, Math.abs(bar.c - bar.o));
          return (
            <g key={i}>
              <line x1={bar.x} y1={bar.top} x2={bar.x} y2={bar.bot} stroke={color} strokeWidth="1.8" />
              <rect x={bar.x - 6} y={y} width="12" height={h} rx="2" fill={color} />
            </g>
          );
        })}

        {/* Optical Chart Magnifying Lens Highlight */}
        <circle
          cx="255"
          cy="78"
          r="38"
          fill="rgba(0, 208, 156, 0.08)"
          stroke="#00D09C"
          strokeWidth="2.2"
        />
        <line
          x1="283"
          y1="106"
          x2="306"
          y2="129"
          stroke="#00D09C"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Floating Signal Tag inside Illustration */}
        <rect x="24" y="22" width="168" height="44" rx="10" fill="#12281F" stroke="#00D09C" strokeWidth="1.2" />
        <circle cx="42" cy="44" r="5" fill="#00D09C" />
        <text x="54" y="40" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="sans-serif">
          BACKTESTED PATTERN
        </text>
        <text x="54" y="54" fill="#00D09C" fontSize="9.5" fontWeight="600" fontFamily="monospace">
          Confidence: 86/100 · R:R 2.4x
        </text>
      </svg>

      <div className="mt-4 flex items-center justify-between text-[11px] text-[#9AB0A5]">
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#00D09C]" />
          Instant Google or Email OTP Sign-In
        </span>
        <span className="font-semibold text-white">100% Free Sandbox</span>
      </div>
    </div>
  );
};
