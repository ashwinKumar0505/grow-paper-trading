/**
 * Shared Tailwind class tokens for the pricing page. Colours reuse the existing
 * NiftyLens palette (#00D09C / #00B386 accents, #0B1310 / #111C17 dark surfaces).
 */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B386] dark:focus-visible:ring-[#00D09C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F6F4] dark:focus-visible:ring-offset-[#0B1310]';

export const surface = 'bg-white dark:bg-[#111C17] border border-[#D9E4DE] dark:border-[#1E3128]';

export const textMuted = 'text-[#5B7066] dark:text-[#9AB0A5]';
export const textStrong = 'text-[#15241D] dark:text-white';
export const accentText = 'text-[#00936E] dark:text-[#00D09C]';

export const sectionHeading = `text-2xl sm:text-3xl font-extrabold tracking-tight ${textStrong}`;

const btnBase = `inline-flex items-center justify-center gap-2 rounded-xl px-5 min-h-11 py-2.5 text-sm font-bold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${focusRing}`;

export const btnPrimary = `${btnBase} bg-[#00B386] hover:bg-[#009A73] text-white dark:bg-[#00D09C] dark:hover:bg-[#2EE0B2] dark:text-[#04261C]`;
export const btnGold = `${btnBase} bg-transparent border border-amber-500/70 text-amber-700 hover:bg-amber-500/10 dark:border-amber-400/70 dark:text-amber-300 dark:hover:bg-amber-400/10`;
export const btnSecondary = `${btnBase} border border-[#CFDCD5] dark:border-[#2A4236] ${textStrong} hover:border-[#00B386] dark:hover:border-[#00D09C] bg-transparent`;
export const btnStatic = `${btnBase} cursor-default border border-dashed border-[#CFDCD5] dark:border-[#2A4236] ${textMuted}`;
