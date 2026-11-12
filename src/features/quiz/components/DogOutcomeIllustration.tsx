import React from 'react';

interface DogOutcomeIllustrationProps {
  isWin: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DogOutcomeIllustration: React.FC<DogOutcomeIllustrationProps> = ({
  isWin,
  className = '',
  size = 'md',
}) => {
  const dimensions =
    size === 'sm'
      ? { width: 70, height: 70 }
      : size === 'lg'
      ? { width: 140, height: 140 }
      : { width: 100, height: 100 };

  if (isWin) {
    // HAPPY DOG: Cheerful smiling Shiba/Golden puppy, wagging tail, party sparkles, tongue out
    return (
      <div className={`relative flex flex-col items-center select-none shrink-0 ${className}`}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_10px_20px_rgba(16,185,129,0.25)] animate-bounce-short"
        >
          {/* Confetti & Sparkles */}
          <circle cx="24" cy="30" r="3.5" fill="#F59E0B" className="animate-ping" opacity="0.8" />
          <polygon points="135,28 138,36 146,36 140,41 142,49 135,44 128,49 130,41 124,36 132,36" fill="#10B981" />
          <polygon points="20,80 22,85 27,85 23,88 24,93 20,90 16,93 17,88 13,85 18,85" fill="#3B82F6" />
          <circle cx="140" cy="88" r="4" fill="#EC4899" />
          <circle cx="80" cy="14" r="3" fill="#F59E0B" />

          {/* Wagging Bushy Tail */}
          <path
            d="M125 110 C145 95, 155 75, 145 60 C138 52, 130 65, 122 85"
            fill="#E09F3E"
            stroke="#C47D2B"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M142 62 C139 58, 132 66, 128 76" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

          {/* Dog Body */}
          <ellipse cx="80" cy="115" rx="38" ry="30" fill="#F3B562" stroke="#D98A2B" strokeWidth="3" />
          {/* White Chest Patch */}
          <ellipse cx="80" cy="118" rx="20" ry="20" fill="#FFF8EE" />

          {/* Front Paws resting happily */}
          <ellipse cx="62" cy="138" rx="11" ry="8" fill="#FFF8EE" stroke="#D98A2B" strokeWidth="2.5" />
          <line x1="58" y1="138" x2="58" y2="143" stroke="#D98A2B" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="64" y1="138" x2="64" y2="143" stroke="#D98A2B" strokeWidth="1.5" strokeLinecap="round" />

          <ellipse cx="98" cy="138" rx="11" ry="8" fill="#FFF8EE" stroke="#D98A2B" strokeWidth="2.5" />
          <line x1="94" y1="138" x2="94" y2="143" stroke="#D98A2B" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="100" y1="138" x2="100" y2="143" stroke="#D98A2B" strokeWidth="1.5" strokeLinecap="round" />

          {/* Cute Green Bullish Bandana / Bowtie */}
          <path d="M66 102 L94 102 L80 118 Z" fill="#10B981" stroke="#059669" strokeWidth="2" />
          <circle cx="80" cy="102" r="4.5" fill="#34D399" />

          {/* Big Fluffy Floppy / Perky Ears */}
          {/* Left Ear */}
          <path
            d="M48 55 C32 40, 22 62, 38 85 C44 75, 48 65, 48 55 Z"
            fill="#D98A2B"
            stroke="#B76E1B"
            strokeWidth="3"
          />
          <path d="M42 58 C35 50, 29 65, 38 78" fill="#F4A261" />

          {/* Right Ear */}
          <path
            d="M112 55 C128 40, 138 62, 122 85 C116 75, 112 65, 112 55 Z"
            fill="#D98A2B"
            stroke="#B76E1B"
            strokeWidth="3"
          />
          <path d="M118 58 C125 50, 131 65, 122 78" fill="#F4A261" />

          {/* Head */}
          <ellipse cx="80" cy="68" rx="36" ry="32" fill="#F3B562" stroke="#D98A2B" strokeWidth="3" />

          {/* Cheerful Shiba White Cheek Markings */}
          <ellipse cx="58" cy="74" rx="14" ry="12" fill="#FFF8EE" />
          <ellipse cx="102" cy="74" rx="14" ry="12" fill="#FFF8EE" />
          <ellipse cx="80" cy="78" rx="16" ry="14" fill="#FFF8EE" />

          {/* Cute Eyebrow Dots */}
          <ellipse cx="64" cy="50" rx="3.5" ry="2.5" fill="#FFF8EE" />
          <ellipse cx="96" cy="50" rx="3.5" ry="2.5" fill="#FFF8EE" />

          {/* Happy Closed/Sparkling Anime Eyes */}
          {/* Left Eye: Joyful crescent curve */}
          <path
            d="M58 64 C62 58, 68 58, 72 64"
            stroke="#2C1810"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Right Eye: Joyful crescent curve */}
          <path
            d="M88 64 C92 58, 98 58, 102 64"
            stroke="#2C1810"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Cute Rosy Cheeks */}
          <ellipse cx="52" cy="73" rx="5" ry="3" fill="#FB7185" opacity="0.6" />
          <ellipse cx="108" cy="73" rx="5" ry="3" fill="#FB7185" opacity="0.6" />

          {/* Button Nose */}
          <path
            d="M75 73 C75 71, 85 71, 85 73 C85 76, 80 78, 80 78 C80 78, 75 76, 75 73 Z"
            fill="#2C1810"
          />
          <circle cx="78" cy="73" r="1.2" fill="#FFFFFF" />

          {/* Big Open Happy Smile with Tongue */}
          <path d="M74 79 Q80 84 86 79" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Tongue */}
          <path
            d="M76 81 C76 81, 76 92, 80 92 C84 92, 84 81, 84 81 Z"
            fill="#FB7185"
            stroke="#E11D48"
            strokeWidth="1.5"
          />
          <line x1="80" y1="81" x2="80" y2="88" stroke="#E11D48" strokeWidth="1" />

          {/* Party Hat on top */}
          <polygon points="80,18 69,44 91,44" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <circle cx="80" cy="18" r="4" fill="#10B981" />
          <path d="M72 36 L88 36" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M75 28 L85 28" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Happy Speech Bubble */}
        <div className="mt-0.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 animate-pulse whitespace-nowrap">
          <span>🐾</span>
          <span>Spot on call!</span>
          <span>🎉</span>
        </div>
      </div>
    );
  }

  // SAD / SYMPATHETIC DOG: Adorable drooping ears, big puppy eyes, comforting sigh
  return (
    <div className={`relative flex flex-col items-center select-none shrink-0 ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_10px_20px_rgba(244,63,94,0.2)]"
      >
        {/* Soft floating sympathy elements */}
        <circle cx="30" cy="40" r="2.5" fill="#94A3B8" opacity="0.4" />
        <circle cx="132" cy="48" r="2" fill="#94A3B8" opacity="0.4" />
        <path d="M130 90 Q135 95 130 100" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" fill="none" />

        {/* Droopy Still Tail */}
        <path
          d="M124 118 C135 125, 142 135, 140 142"
          fill="none"
          stroke="#C47D2B"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Dog Body */}
        <ellipse cx="80" cy="118" rx="38" ry="28" fill="#E5A65E" stroke="#C47D2B" strokeWidth="3" />
        {/* Soft Chest */}
        <ellipse cx="80" cy="120" rx="19" ry="18" fill="#FFF8EE" />

        {/* Front Paws gently tucked */}
        <ellipse cx="64" cy="140" rx="10" ry="7" fill="#FFF8EE" stroke="#C47D2B" strokeWidth="2.5" />
        <line x1="61" y1="140" x2="61" y2="144" stroke="#C47D2B" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="66" y1="140" x2="66" y2="144" stroke="#C47D2B" strokeWidth="1.5" strokeLinecap="round" />

        <ellipse cx="96" cy="140" rx="10" ry="7" fill="#FFF8EE" stroke="#C47D2B" strokeWidth="2.5" />
        <line x1="93" y1="140" x2="93" y2="144" stroke="#C47D2B" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="98" y1="140" x2="98" y2="144" stroke="#C47D2B" strokeWidth="1.5" strokeLinecap="round" />

        {/* Soft Red/Rose Bandana */}
        <path d="M67 106 L93 106 L80 120 Z" fill="#E11D48" stroke="#BE123C" strokeWidth="2" opacity="0.85" />
        <circle cx="80" cy="106" r="4" fill="#F43F5E" />

        {/* Sad Droopy Ears Hanging Down */}
        {/* Left Droopy Ear */}
        <path
          d="M48 64 C35 60, 24 85, 28 110 C32 115, 42 108, 44 92 Z"
          fill="#C47D2B"
          stroke="#A65F17"
          strokeWidth="3"
        />
        <path d="M33 75 C30 90, 34 104, 38 106" stroke="#D98A2B" strokeWidth="2" strokeLinecap="round" />

        {/* Right Droopy Ear */}
        <path
          d="M112 64 C125 60, 136 85, 132 110 C128 115, 118 108, 116 92 Z"
          fill="#C47D2B"
          stroke="#A65F17"
          strokeWidth="3"
        />
        <path d="M127 75 C130 90, 126 104, 122 106" stroke="#D98A2B" strokeWidth="2" strokeLinecap="round" />

        {/* Head */}
        <ellipse cx="80" cy="72" rx="35" ry="31" fill="#E5A65E" stroke="#C47D2B" strokeWidth="3" />

        {/* White Cheek Markings */}
        <ellipse cx="60" cy="78" rx="13" ry="11" fill="#FFF8EE" />
        <ellipse cx="100" cy="78" rx="13" ry="11" fill="#FFF8EE" />
        <ellipse cx="80" cy="81" rx="15" ry="13" fill="#FFF8EE" />

        {/* Eyebrows angled inward (Puppy-dog sad sympathy) */}
        <path d="M56 54 Q65 58 70 55" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M104 54 Q95 58 90 55" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Big Expressive Puppy Eyes looking slightly up/sad */}
        {/* Left Eye */}
        <ellipse cx="64" cy="67" rx="8" ry="9" fill="#2C1810" />
        <circle cx="62" cy="64" r="3.2" fill="#FFFFFF" />
        <circle cx="66" cy="70" r="1.5" fill="#FFFFFF" />

        {/* Right Eye */}
        <ellipse cx="96" cy="67" rx="8" ry="9" fill="#2C1810" />
        <circle cx="94" cy="64" r="3.2" fill="#FFFFFF" />
        <circle cx="98" cy="70" r="1.5" fill="#FFFFFF" />

        {/* Little sympathetic tear/sparkle on cheek */}
        <ellipse cx="54" cy="78" rx="2.5" ry="4" fill="#60A5FA" opacity="0.8" />
        <ellipse cx="55" cy="80" rx="1" ry="1.5" fill="#FFFFFF" />

        {/* Button Nose */}
        <path
          d="M76 77 C76 75, 84 75, 84 77 C84 80, 80 81.5, 80 81.5 C80 81.5, 76 80, 76 77 Z"
          fill="#2C1810"
        />
        <circle cx="78.5" cy="77" r="1" fill="#FFFFFF" />

        {/* Gentle Downward Curve Mouth (Sad / Gentle sigh) */}
        <path d="M74 87 Q80 83 86 87" stroke="#2C1810" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>

      {/* Sympathetic Speech Bubble */}
      <div className="mt-0.5 bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
        <span>🐾</span>
        <span>Shake it off!</span>
        <span>💡</span>
      </div>
    </div>
  );
};
