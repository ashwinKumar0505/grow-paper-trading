import confetti from 'canvas-confetti';

  // Win celebration confetti
export const triggerWinConfetti = () => {
    confetti({
      particleCount: 55,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#F59E0B'],
    });
};

  // Tournament victory confetti
export const triggerTournamentConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
    });
};

