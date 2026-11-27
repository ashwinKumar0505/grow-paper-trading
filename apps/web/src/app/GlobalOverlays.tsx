import { AuthModal } from '../components/AuthModal';
import { AnalyticsConsentBanner } from '../components/common/AnalyticsConsentBanner';
import { RazorpayCheckoutModal } from '../components/RazorpayCheckoutModal';
import { ToastContainer } from '../components/ToastContainer';
import { UpgradeModal } from '../components/UpgradeModal';
import { WalletModal } from '../features/virtual-trading/components/WalletModal';

export function GlobalOverlays() {
  return <>
    <WalletModal />
    <AuthModal />
    <UpgradeModal />
    <RazorpayCheckoutModal />
    <ToastContainer />
    <AnalyticsConsentBanner />
  </>;
}
