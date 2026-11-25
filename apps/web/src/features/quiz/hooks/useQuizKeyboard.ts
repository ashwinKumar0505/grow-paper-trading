import { useEffect } from 'react';
import type { TradeDirection } from '../types/trading';
import type { QuizState } from './useQuizState';

type Options = Pick<QuizState, 'gameMode' | 'survivalState' | 'isRevealing' | 'userTrade' | 'positionSize' | 'isHistoryOpen' | 'setIsHistoryOpen' | 'isGuideOpen' | 'setIsGuideOpen' | 'tournamentState'> & {
  currentView: string;
  executeTrade: (direction: TradeDirection, size?: number) => void;
  handleNextScenario: () => void;
};

export function useQuizKeyboard({ gameMode, survivalState, isRevealing, userTrade, positionSize, isHistoryOpen, setIsHistoryOpen, isGuideOpen, setIsGuideOpen, tournamentState, currentView, executeTrade, handleNextScenario }: Options) {
  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      if (currentView !== 'quiz') return;
      if ((isHistoryOpen || isGuideOpen) && e.key !== 'Escape') return;

      if ((e.code === 'Space' || e.key === 'Enter') && userTrade) {
        e.preventDefault();
        handleNextScenario();
        return;
      }

      if (e.key === 'Escape') {
        if (isHistoryOpen) setIsHistoryOpen(false);
        if (isGuideOpen) setIsGuideOpen(false);
        return;
      }

      const isGameOverState =
        (gameMode === 'survival' && survivalState.isGameOver) ||
        (gameMode === 'tournament' && tournamentState.isCompleted);

      if (currentView === 'quiz' && !isRevealing && !userTrade && !isGameOverState) {
        if (key === 'b') {
          executeTrade('BUY', positionSize);
        } else if (key === 's') {
          executeTrade('SELL', positionSize);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentView,
    isRevealing,
    userTrade,
    survivalState.isGameOver,
    tournamentState.isCompleted,
    gameMode,
    positionSize,
    executeTrade,
    handleNextScenario,
    isHistoryOpen,
    isGuideOpen,
  ]);

}
