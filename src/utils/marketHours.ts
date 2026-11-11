/**
 * Indian Stock Market (NSE / BSE) Trading Hours Utility
 * 
 * Standard Trading Session:
 * - Days: Monday to Friday (excluding official market holidays)
 * - Trading Hours: 09:15 AM to 03:30 PM IST (Indian Standard Time, UTC +5:30)
 * - Pre-market: 09:00 AM to 09:15 AM IST
 * - Post-market / Market Closed: 03:30 PM to 09:15 AM IST & All Weekends (Saturday & Sunday)
 */

export interface MarketStatus {
  isOpen: boolean;
  isWeekend: boolean;
  statusLabel: string; // e.g. "NSE / BSE LIVE" or "MARKET CLOSED"
  subText: string;     // e.g. "Session active until 03:30 PM IST" or "Opens Mon at 09:15 AM IST"
  istTimeString: string;
  nextOpenText: string;
}

export function getIndianMarketStatus(): MarketStatus {
  // Compute exact Indian Standard Time (IST, UTC+05:30) using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });

  const parts = formatter.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const dayOfWeekStr = map.weekday; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  const isWeekend = dayOfWeekStr === 'Sat' || dayOfWeekStr === 'Sun';
  const hours = parseInt(map.hour || '0', 10);
  const minutes = parseInt(map.minute || '0', 10);
  const currentMinuteOfDay = hours * 60 + minutes;

  const marketOpenMinute = 9 * 60 + 15;   // 09:15 AM IST
  const marketCloseMinute = 15 * 60 + 30; // 03:30 PM IST

  const isOpen = !isWeekend && currentMinuteOfDay >= marketOpenMinute && currentMinuteOfDay < marketCloseMinute;

  let statusLabel = isOpen ? 'NSE / BSE LIVE' : 'MARKET CLOSED';
  let subText = '';
  let nextOpenText = '';

  if (isOpen) {
    subText = 'Live session · Closes at 03:30 PM IST';
    nextOpenText = 'Session in progress';
  } else if (isWeekend) {
    statusLabel = 'MARKET CLOSED (WEEKEND)';
    subText = 'NSE & BSE closed · Opens Monday at 09:15 AM IST';
    nextOpenText = 'Opens Monday 09:15 AM IST';
  } else if (currentMinuteOfDay < marketOpenMinute) {
    statusLabel = 'PRE-MARKET';
    subText = 'Session opens today at 09:15 AM IST';
    nextOpenText = 'Opens today 09:15 AM IST';
  } else {
    // After 03:30 PM IST
    statusLabel = 'MARKET CLOSED';
    if (dayOfWeekStr === 'Fri') {
      subText = 'Post-market · Opens Monday at 09:15 AM IST';
      nextOpenText = 'Opens Monday 09:15 AM IST';
    } else {
      subText = 'Post-market · Opens tomorrow at 09:15 AM IST';
      nextOpenText = 'Opens tomorrow 09:15 AM IST';
    }
  }

  const istHours12 = hours % 12 || 12;
  const istAmPm = hours >= 12 ? 'PM' : 'AM';
  const istTimeString = `${String(istHours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${istAmPm} IST`;

  return {
    isOpen,
    isWeekend,
    statusLabel,
    subText,
    istTimeString,
    nextOpenText,
  };
}
