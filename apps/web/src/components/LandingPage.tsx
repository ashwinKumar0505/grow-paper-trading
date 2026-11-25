import React from 'react';
import { LearningSection } from './LearningSection';
import { LandingCTA } from './landing/LandingCTA';
import { LandingFAQ } from './landing/LandingFAQ';
import { LandingFooter } from './landing/LandingFooter';
import { LandingHero } from './landing/LandingHero';
import { LandingLearn } from './landing/LandingLearn';
import { LandingPricing } from './landing/LandingPricing';
import { LandingScreener } from './landing/LandingScreener';
import { LandingTicker } from './landing/LandingTicker';
import { LandingTrading } from './landing/LandingTrading';
import { useLandingPage } from './landing/useLandingPage';
import { WorkspaceHeader } from './navigation/WorkspaceHeader';

export const LandingPage: React.FC = () => {
const model = useLandingPage();
return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F3F6F4] dark:bg-[#0B1310] text-[#15241D] dark:text-[#E9F2EE] font-sans transition-colors selection:bg-[#00D09C]/20 selection:text-[#00D09C]">
      <WorkspaceHeader />

      <LandingHero {...model} />

      <LandingTicker {...model} />

      <LandingTrading {...model} />

      <LandingScreener {...model} />

      <LandingLearn />

      <LearningSection onStartTrading={model.handleGetStarted} />

      <LandingPricing {...model} />

      <LandingFAQ {...model} />

      <LandingCTA {...model} />

      <LandingFooter />
    </div>
  );

};
