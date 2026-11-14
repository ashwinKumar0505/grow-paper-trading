import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ChartScenario,
  ChartType,
  DifficultyLevel,
  GameMode,
  IndicatorSettings,
  QuizStats,
  SurvivalState,
  TournamentState,
  TradeDirection,
  TradeRecord,
  UserStats,
} from './types/trading';
import { generateScenario } from './utils/dataGenerator';
import { sound } from './utils/sound';
import { QuizToolbar } from './components/QuizToolbar';
import { ChartHeader } from './components/ChartHeader';
import { TradingCanvas } from './components/TradingCanvas';
import { ActionDock } from './components/ActionDock';
import { OutcomeModal } from './components/OutcomeModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PatternGuideModal } from './components/PatternGuideModal';
import { TournamentResultModal } from './components/TournamentResultModal';
import { SurvivalGameOverModal } from './components/SurvivalGameOverModal';
import { ModeSelectPage } from './components/ModeSelectPage';
import { navigate, usePathname } from '../../lib/navigation';
import { LearnChartsPage } from './components/LearnChartsPage';
import { useTrading } from '../../context/TradingContext';

const DEFAULT_INDICATORS: IndicatorSettings = {
  showEma20: true,
  showSma50: false,
  showVolume: true,
  showRsi: false,
  showLevels: true,
};

const INITIAL_QUIZ_STATS: QuizStats = {
  totalQuestions: 0,
  correctAnswers: 0,
  currentStreak: 0,
  bestStreak: 0,
  recentResults: [],
};

const INITIAL_SURVIVAL: SurvivalState = {
  lives: 3,
  maxLives: 3,
  streak: 0,
  bestStreak: 0,
  score: 0,
  isGameOver: false,
  roundsSurvived: 0,
};

const INITIAL_TOURNAMENT: TournamentState = {
  currentRound: 1,
  totalRounds: 10,
  startingBalance: 10000,
  balance: 10000,
  trades: [],
  isCompleted: false,
};

const INITIAL_STATS: UserStats = {
  balance: 10000,
  startingBalance: 10000,
  totalTrades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  currentStreak: 0,
  bestStreak: 0,
  netProfit: 0,
  tradeHistory: [],
};

export default function QuizApp() {
  const { planConfig, consumeQuizQuestion, openUpgradeModal } = useTrading();
  // URL navigation keeps deep links and browser history in sync.
  const pathname = usePathname();
  const currentView =
    pathname === '/quiz/play'
      ? 'quiz'
      : pathname === '/learn' || pathname === '/pattern-library'
      ? 'learn-charts'
      : 'mode-select';
  const setCurrentView = (view: 'quiz' | 'learn-charts' | 'mode-select') =>
    navigate(view === 'quiz' ? '/quiz/play' : view === 'learn-charts' ? '/learn' : '/quiz');
  const revealTimer = useRef<number | null>(null);
  const tradeInFlight = useRef(false);
  useEffect(() => {
    return () => {
      if (revealTimer.current !== null) window.clearInterval(revealTimer.current);
      tradeInFlight.current = false;
    };
  }, [pathname]);
  useEffect(() => {
    setIsRevealing(false);
    setIsHistoryOpen(false);
    setIsGuideOpen(false);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
    if (pathname === '/quiz/play') {
      setScenario(generateScenario(difficulty));
      setTradeNumber(1);
      setTournamentState(INITIAL_TOURNAMENT);
      setSurvivalState(prev => ({ ...INITIAL_SURVIVAL, bestStreak: prev.bestStreak }));
    }
  }, [pathname]);

  // Difficulty Level: 'All' | 'Beginner' | 'Intermediate' | 'Advanced'
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => {
    const saved = localStorage.getItem('tradepulse_difficulty');
    return ['All', 'Beginner', 'Intermediate', 'Advanced'].includes(saved || '') ? saved as DifficultyLevel : 'Beginner';
  });

  // Game Mode: 'quiz' (Casual Learn) vs 'survival' (3 Hearts) vs 'tournament' (10-Round Cash)
  const [gameMode, setGameMode] = useState<GameMode>('quiz');

  // Survival Mode State
  const [survivalState, setSurvivalState] = useState<SurvivalState>(() => {
    const savedBest = localStorage.getItem('tradepulse_survival_best_streak');
    const best = savedBest ? Number(savedBest) : 0;
    return {
      ...INITIAL_SURVIVAL,
      bestStreak: isNaN(best) ? 0 : best,
    };
  });

  // Application State
  const [scenario, setScenario] = useState<ChartScenario>(() => generateScenario(difficulty));
  const [tradeNumber, setTradeNumber] = useState<number>(1);
  const [revealedOutcomeCount, setRevealedOutcomeCount] = useState<number>(0);
  const [isRevealing, setIsRevealing] = useState<boolean>(false);
  const [userTrade, setUserTrade] = useState<TradeRecord | null>(null);
  const [chosenDirection, setChosenDirection] = useState<TradeDirection | null>(null);
  const [entryPrice, setEntryPrice] = useState<number | null>(null);

  // Tournament Risk Controls (Virtual Cash Mode only)
  const [positionSize, setPositionSize] = useState<number>(1000);

  // Settings & Toggles
  const [indicatorSettings, setIndicatorSettings] = useState<IndicatorSettings>(() => {
    const saved = localStorage.getItem('tradepulse_indicators');
    try { return saved ? { ...DEFAULT_INDICATORS, ...JSON.parse(saved) } : DEFAULT_INDICATORS; } catch { return DEFAULT_INDICATORS; }
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [chartType, setChartType] = useState<ChartType>(() => {
    const saved = localStorage.getItem('tradepulse_chart_type');
    return (saved as ChartType) || 'candle';
  });

  // Quiz Stats (Pure accuracy, no money)
  const [quizStats, setQuizStats] = useState<QuizStats>(() => {
    const saved = localStorage.getItem('tradeplaybook_india_quiz_stats_v1');
    if (saved) {
      try {
        return { ...INITIAL_QUIZ_STATS, ...JSON.parse(saved) };
      } catch {
        return INITIAL_QUIZ_STATS;
      }
    }
    return INITIAL_QUIZ_STATS;
  });

  // Tournament State (10 Rounds with ₹10,000 Virtual Cash)
  const [tournamentState, setTournamentState] = useState<TournamentState>(INITIAL_TOURNAMENT);

  // Overall Historical Trades for drawer
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('tradeplaybook_india_stats_v1');
    if (saved) {
      try {
        return { ...INITIAL_STATS, ...JSON.parse(saved) };
      } catch {
        return INITIAL_STATS;
      }
    }
    return INITIAL_STATS;
  });

  useEffect(() => { localStorage.setItem('tradepulse_difficulty', difficulty); }, [difficulty]);
  useEffect(() => { localStorage.setItem('tradepulse_survival_best_streak', String(survivalState.bestStreak)); }, [survivalState.bestStreak]);

  // Save Quiz Stats to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradeplaybook_india_quiz_stats_v1', JSON.stringify(quizStats));
  }, [quizStats]);

  // Save Overall Stats to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradeplaybook_india_stats_v1', JSON.stringify(stats));
  }, [stats]);

  // Save indicator settings to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradepulse_indicators', JSON.stringify(indicatorSettings));
  }, [indicatorSettings]);

  // Save chart type preference to LocalStorage
  useEffect(() => {
    localStorage.setItem('tradepulse_chart_type', chartType);
  }, [chartType]);

  // Handle Indicator Toggle
  const handleToggleIndicator = useCallback((key: keyof IndicatorSettings) => {
    setIndicatorSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    sound.playClick();
  }, []);

  // Reset Stats
  const handleResetStats = useCallback(() => {
    setQuizStats(INITIAL_QUIZ_STATS);
    setStats(INITIAL_STATS);
    localStorage.removeItem('tradeplaybook_india_quiz_stats_v1');
    localStorage.removeItem('tradeplaybook_india_stats_v1');
  }, []);

  // Win celebration confetti
  const triggerWinConfetti = useCallback(() => {
    confetti({
      particleCount: 55,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#F59E0B'],
    });
  }, []);

  // Tournament victory confetti
  const triggerTournamentConfetti = useCallback(() => {
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6'],
    });
  }, []);

  // Execute Trade Decision
  const executeTrade = useCallback(
    (direction: TradeDirection, size: number = 1000) => {
      if (tradeInFlight.current || isRevealing || userTrade) return;
      if (!consumeQuizQuestion()) {
        return;
      }
      tradeInFlight.current = true;
      size = gameMode === 'tournament' ? Math.min(Math.max(0, size), tournamentState.balance) : size;

      sound.playClick();
      setChosenDirection(direction);
      setIsRevealing(true);

      const currentEntryPrice = scenario.candles[scenario.setupCount - 1].close;
      setEntryPrice(currentEntryPrice);

      const totalToReveal = scenario.outcomeCount;
      let revealed = 0;

      // Animate future candles one-by-one into view
      const interval = window.setInterval(() => {
        revealed++;
        setRevealedOutcomeCount(revealed);
        sound.playTick();

        if (revealed >= totalToReveal) {
          clearInterval(interval);
          revealTimer.current = null;
          setIsRevealing(false);

          // Calculate price shift
          const finalExitPrice = scenario.candles[scenario.candles.length - 1].close;
          const rawPriceChangePct = ((finalExitPrice - currentEntryPrice) / currentEntryPrice) * 100;

          // Win condition: did direction match market movement?
          const isWin = direction === 'BUY' ? rawPriceChangePct > 0 : rawPriceChangePct < 0;

          // Virtual cash calculations (for Tournament mode)
          const tradePnlPct = direction === 'BUY' ? rawPriceChangePct : -rawPriceChangePct;
          const tradePnl = size * (tradePnlPct / 100);

          // Sound & Confetti
          if (isWin) {
            sound.playWin();
            triggerWinConfetti();
          } else {
            sound.playLoss();
          }

          const record: TradeRecord = {
            id: `trade_${Date.now()}`,
            roundNumber: tournamentState.currentRound,
            scenarioId: scenario.id,
            assetSymbol: scenario.assetSymbol,
            assetName: scenario.assetName,
            timeframe: scenario.timeframe,
            patternName: scenario.patternName,
            patternCategory: scenario.patternCategory,
            direction,
            entryPrice: currentEntryPrice,
            exitPrice: finalExitPrice,
            priceChangePct: rawPriceChangePct,
            leverage: 1,
            positionSize: size,
            pnl: tradePnl,
            pnlPct: tradePnlPct,
            isWin,
            timestamp: Date.now(),
            explanation: scenario.explanation,
          };

          setUserTrade(record);

          // Update Survival Mode State
          if (gameMode === 'survival') {
            setSurvivalState((prev) => {
              const newLives = isWin ? prev.lives : Math.max(0, prev.lives - 1);
              const newStreak = isWin ? prev.streak + 1 : 0;
              const multiplier = Math.max(1, Math.min(5, Math.floor(newStreak / 2) + 1));
              const pts = isWin ? 100 * multiplier : 0;
              return {
                ...prev,
                lives: newLives,
                streak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                score: prev.score + pts,
                roundsSurvived: isWin ? prev.roundsSurvived + 1 : prev.roundsSurvived,
              };
            });
          }

          // Update Learn Quiz stats
          if (gameMode === 'quiz') {
            setQuizStats((prev) => {
              const newStreak = isWin ? prev.currentStreak + 1 : 0;
              return {
                totalQuestions: prev.totalQuestions + 1,
                correctAnswers: isWin ? prev.correctAnswers + 1 : prev.correctAnswers,
                currentStreak: newStreak,
                bestStreak: Math.max(prev.bestStreak, newStreak),
                recentResults: [...prev.recentResults.slice(-9), isWin],
              };
            });
          }

          // Update 10-Round Tournament state
          if (gameMode === 'tournament') {
            setTournamentState((prev) => {
              const newBalance = Math.max(0, prev.balance + tradePnl);
              const isLast = prev.currentRound >= prev.totalRounds;
              return {
                ...prev,
                balance: newBalance,
                trades: [...prev.trades, record],
                isCompleted: isLast,
              };
            });
          }

          // Also record to overall history
          setStats((prev) => {
            const newWins = isWin ? prev.wins + 1 : prev.wins;
            const newLosses = !isWin ? prev.losses + 1 : prev.losses;
            const newTotal = prev.totalTrades + 1;
            return {
              ...prev,
              totalTrades: newTotal,
              wins: newWins,
              losses: newLosses,
              winRate: (newWins / newTotal) * 100,
              currentStreak: isWin ? prev.currentStreak + 1 : 0,
              bestStreak: Math.max(prev.bestStreak, isWin ? prev.currentStreak + 1 : 0),
              netProfit: prev.netProfit + tradePnl,
              tradeHistory: [record, ...prev.tradeHistory],
            };
          });
        }
      }, 75);
      revealTimer.current = interval;
    },
    [isRevealing, userTrade, scenario, gameMode, tournamentState.currentRound, tournamentState.balance, triggerWinConfetti]
  );

  // Advance to Next Chart Scenario or show tournament / survival results
  const handleNextScenario = useCallback(() => {
    sound.playClick();

    if (gameMode === 'survival') {
      if (survivalState.lives <= 0) {
        // Player is out of lives! Close round modal and show SurvivalGameOverModal
        tradeInFlight.current = false;
        setUserTrade(null);
        setSurvivalState((prev) => ({ ...prev, isGameOver: true }));
        return;
      }
    }

    if (gameMode === 'tournament') {
      if (tournamentState.currentRound >= tournamentState.totalRounds) {
        // Tournament finished! Close the per-round modal so TournamentResultModal shows
        tradeInFlight.current = false;
        setUserTrade(null);
        triggerTournamentConfetti();
        return;
      }
      setTournamentState((prev) => ({
        ...prev,
        currentRound: prev.currentRound + 1,
      }));
    }

    const next = generateScenario(difficulty);
    setScenario(next);
    setTradeNumber((n) => n + 1);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [gameMode, survivalState.lives, tournamentState.currentRound, tournamentState.totalRounds, difficulty, triggerTournamentConfetti]);

  // Restart 10-Round Tournament
  const handleRestartTournament = useCallback(() => {
    sound.playClick();
    setTournamentState(INITIAL_TOURNAMENT);
    const next = generateScenario(difficulty);
    setScenario(next);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [difficulty]);

  // Retry Survival Challenge (Resets to 3 Lives)
  const handleRetrySurvival = useCallback(() => {
    sound.playClick();
    setSurvivalState((prev) => ({
      ...INITIAL_SURVIVAL,
      bestStreak: prev.bestStreak,
    }));
    const next = generateScenario(difficulty);
    setScenario(next);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
  }, [difficulty]);

  // Launch Quiz from Mode & Difficulty Setup Page
  const handleLaunchQuiz = useCallback((selectedMode: GameMode, selectedDifficulty: DifficultyLevel = difficulty) => {
    if (!planConfig.quizAllowedModes.includes(selectedMode)) {
      openUpgradeModal({
        requiredTier: selectedMode === 'survival' ? 'beginner' : 'advanced',
        featureName: `Guess the Chart — ${selectedMode === 'survival' ? 'Survival' : 'Cash Challenge'} Mode`,
        featureDescription:
          selectedMode === 'survival'
            ? '3-Lives Survival Mode is unlocked on the Beginner (₹299/mo) and Advanced (₹699/mo) packages.'
            : '10-Round Cash Challenge Tournament is exclusive to the Advanced Package (₹699/mo).',
      });
      return;
    }
    if (!planConfig.quizAllowedDifficulties.includes(selectedDifficulty)) {
      openUpgradeModal({
        requiredTier: selectedDifficulty === 'Intermediate' ? 'beginner' : 'advanced',
        featureName: `${selectedDifficulty} Chart Difficulty`,
        featureDescription:
          selectedDifficulty === 'Intermediate'
            ? 'Intermediate chart setups require the Beginner (₹299/mo) or Advanced (₹699/mo) package.'
            : 'Advanced & Mixed chart setups require the Advanced Package (₹699/mo).',
      });
      return;
    }
    sound.playClick();
    setGameMode(selectedMode);
    setDifficulty(selectedDifficulty);

    if (selectedMode === 'survival') {
      setSurvivalState((prev) => ({
        ...INITIAL_SURVIVAL,
        bestStreak: prev.bestStreak,
      }));
    } else if (selectedMode === 'tournament') {
      setTournamentState(INITIAL_TOURNAMENT);
    }

    const next = generateScenario(selectedDifficulty);
    setScenario(next);
    setTradeNumber(1);
    setRevealedOutcomeCount(0);
    tradeInFlight.current = false;
    setUserTrade(null);
    setChosenDirection(null);
    setEntryPrice(null);
    setCurrentView('quiz');
  }, [difficulty]);

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

  // 2. Separate Mode & Difficulty Selection Page
  if (currentView === 'mode-select') {
    return (
      <ModeSelectPage
        initialMode={gameMode}
        initialDifficulty={difficulty}
        onLaunchQuiz={handleLaunchQuiz}
        onBackToHome={() => setCurrentView('mode-select')}
        onOpenLearnCharts={() => setCurrentView('learn-charts')}
      />
    );
  }

  // 3. Dedicated Learn Charts Page (Left: Pattern Catalog, Right: Interactive Chart Examples)
  if (currentView === 'learn-charts') {
    return (
      <LearnChartsPage
        onBackToHome={() => setCurrentView('mode-select')}
        onStartQuiz={(mode, diff) => handleLaunchQuiz(mode, diff)}
      />
    );
  }

  // 4. Quiz Arena View
  return (
    <div className="quiz-arena flex flex-col w-full bg-[var(--quiz-bg)] text-[var(--quiz-text)] overflow-hidden font-sans">
      {/* 1. Global Navigation & Metric Header */}
      <QuizToolbar
        mode={gameMode}
        difficulty={difficulty}
        onSelectMode={(m) => handleLaunchQuiz(m, difficulty)}
        onOpenModeSelect={() => setCurrentView('mode-select')}
        quizStats={quizStats}
        survivalState={survivalState}
        tournamentState={tournamentState}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onGoHome={() => setCurrentView('mode-select')}
        onOpenLearnCharts={() => setCurrentView('learn-charts')}
      />

      {/* 2. Chart Sub-Header with Indicator Controls & Normal vs Candle Switch */}
      <ChartHeader
        scenario={scenario}
        tradeNumber={tradeNumber}
        indicatorSettings={indicatorSettings}
        onToggleIndicator={handleToggleIndicator}
        chartType={chartType}
        onToggleChartType={setChartType}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* 3. Main Chart Canvas Viewport */}
      <main className="flex-1 w-full relative min-h-[280px]">
        <TradingCanvas
          candles={scenario.candles}
          setupCount={scenario.setupCount}
          revealedOutcomeCount={revealedOutcomeCount}
          indicatorSettings={indicatorSettings}
          tradeDirection={chosenDirection}
          entryPrice={entryPrice}
          isRevealing={isRevealing}
          supportLevel={scenario.supportLevel}
          resistanceLevel={scenario.resistanceLevel}
          chartType={chartType}
          onToggleChartType={setChartType}
          hideChartTypeToggle
        />
      </main>

      {/* 4. Decision & Execution Dock */}
      <ActionDock
        mode={gameMode}
        outcomeCount={scenario.outcomeCount}
        onTrade={executeTrade}
        disabled={
          isRevealing ||
          userTrade !== null ||
          (gameMode === 'survival' && survivalState.isGameOver) ||
          (gameMode === 'tournament' && tournamentState.isCompleted)
        }
        userBalance={tournamentState.balance}
        positionSize={positionSize}
        onChangePositionSize={setPositionSize}
        tournamentRound={tournamentState.currentRound}
        tournamentTotalRounds={tournamentState.totalRounds}
        survivalLives={survivalState.lives}
        survivalMaxLives={survivalState.maxLives}
        survivalStreak={survivalState.streak}
      />

      {/* 5. Post-Trade Outcome & Pattern Analysis Modal */}
      {userTrade && (
        <OutcomeModal
          trade={userTrade}
          scenario={scenario}
          mode={gameMode}
          onNext={handleNextScenario}
          tournamentRound={tournamentState.currentRound}
          tournamentTotalRounds={tournamentState.totalRounds}
          tournamentBalance={tournamentState.balance}
          survivalLives={survivalState.lives}
          survivalMaxLives={survivalState.maxLives}
          survivalStreak={survivalState.streak}
          survivalRoundsSurvived={survivalState.roundsSurvived}
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      )}

      {/* 6. Survival Challenge Game Over Modal (When out of hearts) */}
      {gameMode === 'survival' && survivalState.isGameOver && !userTrade && (
        <SurvivalGameOverModal
          survivalState={survivalState}
          difficulty={difficulty}
          onRetry={handleRetrySurvival}
          onChangeMode={() => setCurrentView('mode-select')}
          onGoHome={() => setCurrentView('mode-select')}
        />
      )}

      {/* 7. 10-Round Tournament Final Result Modal */}
      {gameMode === 'tournament' && tournamentState.isCompleted && !userTrade && (
        <TournamentResultModal
          tournamentState={tournamentState}
          onRestartTournament={handleRestartTournament}
          onSwitchToQuiz={() => handleLaunchQuiz('quiz', difficulty)}
          onGoHome={() => setCurrentView('mode-select')}
        />
      )}

      {/* 8. History & Performance Analytics Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        stats={stats}
        onResetStats={handleResetStats}
      />

      {/* 9. Technical Pattern Reference Guide Modal */}
      <PatternGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
