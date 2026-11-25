import { ActionDock } from './components/ActionDock';
import { ChartHeader } from './components/ChartHeader';
import { HistoryDrawer } from './components/HistoryDrawer';
import { LearnChartsPage } from './components/LearnChartsPage';
import { MobileQuizBar } from './components/MobileQuizBar';
import { ModeSelectPage } from './components/ModeSelectPage';
import { OutcomeModal } from './components/OutcomeModal';
import { PatternGuideModal } from './components/PatternGuideModal';
import { QuizToolbar } from './components/QuizToolbar';
import { SurvivalGameOverModal } from './components/SurvivalGameOverModal';
import { TournamentResultModal } from './components/TournamentResultModal';
import { TradingCanvas } from './components/TradingCanvas';
import { useQuizSession } from './hooks/useQuizSession';

export default function QuizApp() {
  const { difficulty, gameMode, survivalState, scenario, tradeNumber, revealedOutcomeCount, isRevealing, userTrade, chosenDirection, entryPrice, positionSize, setPositionSize, indicatorSettings, isHistoryOpen, setIsHistoryOpen, isGuideOpen, setIsGuideOpen, chartType, setChartType, quizStats, tournamentState, stats, handleNextScenario, handleRestartTournament, handleRetrySurvival, handleLaunchQuiz, currentView, setCurrentView, executeTrade, handleToggleIndicator, handleOpenHistory, handleResetStats } = useQuizSession();
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
      {/* 1a. Compact Mobile Header with Single Expandable Options Drawer (Closed by Default) */}
      <MobileQuizBar
        mode={gameMode}
        difficulty={difficulty}
        scenario={scenario}
        tradeNumber={tradeNumber}
        quizStats={quizStats}
        survivalState={survivalState}
        tournamentState={tournamentState}
        indicatorSettings={indicatorSettings}
        onToggleIndicator={handleToggleIndicator}
        chartType={chartType}
        onToggleChartType={setChartType}
        onOpenModeSelect={() => setCurrentView('mode-select')}
        onOpenHistory={handleOpenHistory}
        onOpenGuide={() => setIsGuideOpen(true)}
        onGoHome={() => setCurrentView('mode-select')}
        onOpenLearnCharts={() => setCurrentView('learn-charts')}
      />

      {/* 1b. Desktop Global Navigation & Metric Header */}
      <QuizToolbar
        mode={gameMode}
        difficulty={difficulty}
        onSelectMode={(m) => handleLaunchQuiz(m, difficulty)}
        onOpenModeSelect={() => setCurrentView('mode-select')}
        quizStats={quizStats}
        survivalState={survivalState}
        tournamentState={tournamentState}
        onOpenHistory={handleOpenHistory}
        onOpenGuide={() => setIsGuideOpen(true)}
        onGoHome={() => setCurrentView('mode-select')}
        onOpenLearnCharts={() => setCurrentView('learn-charts')}
      />

      {/* 2. Desktop Chart Sub-Header with Indicator Controls & Normal vs Candle Switch */}
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
      <main className="flex-1 w-full relative min-h-[260px] sm:min-h-[280px]">
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
