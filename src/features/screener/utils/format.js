export const fmtPrice = (v, digits = 2) =>
  v == null || Number.isNaN(Number(v))
    ? '—'
    : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtPct = (v, digits = 1, withSign = true) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return `${withSign && n > 0 ? '+' : ''}${n.toFixed(digits)}%`;
};

// Indian-style large amounts: ₹ Cr / ₹ L Cr
export const fmtCrore = (v) => {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const cr = Number(v) / 1e7;
  const abs = Math.abs(cr);
  if (abs >= 1e5) return `₹${(cr / 1e5).toFixed(2)} L Cr`;
  if (abs >= 1000) return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Cr`;
  return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const days = Math.floor(diff / 86400);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// "2026-11-12 (Confirmed Trigger)" -> "12 Nov";  "Est. 2026-11-18 (~4 trading days)" -> "18 Nov"
export const shortDate = (text) => {
  if (!text) return '—';
  const m = String(text).match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return text;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// "2026-11-11 11:30 IST" -> "11:30 AM";  "Est. 13:00 IST" -> "1:00 PM"
export const shortTime = (text) => {
  if (!text) return '—';
  const m = String(text).match(/(\d{1,2}):(\d{2})/);
  if (!m) return text;
  let h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
};

export const confidenceLevel = (score) => {
  if (score >= 80) return { label: 'High', tone: 'high' };
  if (score >= 65) return { label: 'Good', tone: 'good' };
  if (score >= 50) return { label: 'Fair', tone: 'fair' };
  return { label: 'Low', tone: 'low' };
};
