import type { TradingContextType } from '../../../features/virtual-trading/types/tradingContext';
import { auth,firebaseSignOut } from '../../../lib/firebase';
import type { TradingState } from './useTradingState';
type Options = Pick<TradingState, 'setUser' | 'setShowLandingPage'> & Pick<TradingContextType, 'addToast'>;

export function useSignOut({ setUser, setShowLandingPage, addToast }: Options) {
  // Sign out user (Firebase & local)
  const logOutUser = () => {
    setUser(null);
    try {
      localStorage.removeItem('mypaper_user_v2');
      localStorage.removeItem('groww_paper_user_v1');
    } catch {}
    try {
      firebaseSignOut(auth).catch(() => {});
    } catch {}
    setShowLandingPage(true);
    addToast('Signed Out', 'You have signed out of your account.', 'info');
  };

  return { logOutUser };
}
