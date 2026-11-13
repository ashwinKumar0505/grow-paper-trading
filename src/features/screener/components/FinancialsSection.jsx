import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { fmtCrore, fmtPct } from '../utils/format';
import { Segmented, SectionCard, StatCard, Hint } from './ui';

const memo = {};

function growth(curr, prev) {
  if (curr == null || prev == null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function BarsChart({ rows }) {
  const width = 640;
  const height = 230;
  const pad = { top: 18, bottom: 32, left: 8, right: 8 };
  const plotH = height - pad.top - pad.bottom;
  const values = rows.flatMap((r) => [r.revenue || 0, r.net_profit || 0]);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;
  const y = (v) => pad.top + ((maxV - v) / range) * plotH;
  const groupW = (width - pad.left - pad.right) / rows.length;
  const barW = Math.min(30, groupW * 0.3);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="fin-svg">
      <line x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} style={{ stroke: 'var(--border-strong)' }} />
      {rows.map((r, i) => {
        const cx = pad.left + groupW * i + groupW / 2;
        const rev = r.revenue || 0;
        const pro = r.net_profit || 0;
        return (
          <g key={r.end_date}>
            <title>{`${r.period}\nRevenue: ${fmtCrore(r.revenue)}\nNet profit: ${fmtCrore(r.net_profit)}`}</title>
            <rect x={cx - barW - 2} y={Math.min(y(rev), y(0))} width={barW} height={Math.abs(y(rev) - y(0))} rx="4" style={{ fill: 'var(--fin-revenue)' }} />
            <rect x={cx + 2} y={Math.min(y(pro), y(0))} width={barW} height={Math.max(1, Math.abs(y(pro) - y(0)))} rx="4" style={{ fill: pro >= 0 ? 'var(--fin-profit)' : 'var(--down)' }} />
            <text x={cx} y={height - 10} textAnchor="middle" fontSize="12" style={{ fill: 'var(--text-muted)' }} fontWeight="600">
              {r.period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function FinancialsSection({ symbol }) {
  const [data, setData] = useState(memo[symbol] || null);
  const [loading, setLoading] = useState(!memo[symbol]);
  const [error, setError] = useState('');
  const [view, setView] = useState('yearly');

  useEffect(() => {
    let alive = true;
    if (memo[symbol]) {
      setData(memo[symbol]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setError('');
    setData(null);
    api
      .getStockFinancials(symbol)
      .then((res) => {
        if (!alive) return;
        memo[symbol] = res;
        setData(res);
        if (!res.yearly?.length && res.quarterly?.length) setView('quarterly');
      })
      .catch((e) => alive && setError(e.message || 'Could not load company financials.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [symbol]);

  const rows = (view === 'yearly' ? data?.yearly : data?.quarterly) || [];
  const latest = rows[rows.length - 1];
  const prev = view === 'yearly' ? rows[rows.length - 2] : rows[rows.length - 5] || rows[rows.length - 2];
  const prevLabel = view === 'yearly' ? 'vs last year' : rows.length >= 5 ? 'vs same quarter last year' : 'vs previous quarter';
  const revG = growth(latest?.revenue, prev?.revenue);
  const proG = growth(latest?.net_profit, prev?.net_profit);

  return (
    <SectionCard
      title={
        <>
          <BarChart3 size={18} /> Revenue & profit
        </>
      }
      subtitle="How much the company sells (revenue) and how much it keeps after all expenses (net profit)."
      actions={
        data?.available && (
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'yearly', label: 'Yearly' },
              { value: 'quarterly', label: 'Quarterly' },
            ]}
          />
        )
      }
    >
      {loading ? (
        <div className="fin-loading">
          <RefreshCw size={16} className="spin" /> Loading company financials…
        </div>
      ) : error ? (
        <div className="muted-box">{error}</div>
      ) : !data?.available || rows.length === 0 ? (
        <div className="muted-box">{data?.message || 'Revenue and profit figures are not available for this stock.'}</div>
      ) : (
        <>
          <div className="stat-grid four">
            <StatCard
              label={`Revenue (${latest.period})`}
              value={fmtCrore(latest.revenue)}
              sub={revG != null ? <span className={revG >= 0 ? 'text-up' : 'text-down'}>{fmtPct(revG)} {prevLabel}</span> : null}
            />
            <StatCard
              label={`Net profit (${latest.period})`}
              value={fmtCrore(latest.net_profit)}
              sub={proG != null ? <span className={proG >= 0 ? 'text-up' : 'text-down'}>{fmtPct(proG)} {prevLabel}</span> : null}
            />
            <StatCard
              label={
                <>
                  Profit margin <Hint text="Out of every ₹100 of sales, how much is left as profit." />
                </>
              }
              value={latest.profit_margin_pct != null ? `${latest.profit_margin_pct.toFixed(1)}%` : '—'}
              sub={latest.profit_margin_pct != null ? `₹${latest.profit_margin_pct.toFixed(0)} profit per ₹100 sales` : null}
            />
            <StatCard
              label={
                <>
                  P/E ratio <Hint text="Price ÷ yearly earnings per share. Lower can mean cheaper, but compare within the same industry." />
                </>
              }
              value={data.key_stats?.pe_ratio != null ? data.key_stats.pe_ratio.toFixed(1) : '—'}
              sub={data.key_stats?.market_cap ? `Company value ${fmtCrore(data.key_stats.market_cap)}` : null}
            />
          </div>

          <div className="fin-chart-wrap">
            <div className="fin-legend">
              <span><i style={{ background: 'var(--fin-revenue)' }} /> Revenue</span>
              <span><i style={{ background: 'var(--fin-profit)' }} /> Net profit</span>
            </div>
            <BarsChart rows={rows} />
          </div>

          <div className="table-wrap">
            <table className="dtable compact">
              <thead>
                <tr>
                  <th>Period</th>
                  <th className="num">Revenue</th>
                  <th className="num">Net profit</th>
                  <th className="num">Profit margin</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.end_date}>
                    <td><strong>{r.period}</strong></td>
                    <td className="num">{fmtCrore(r.revenue)}</td>
                    <td className={`num ${r.net_profit < 0 ? 'text-down' : ''}`}>{fmtCrore(r.net_profit)}</td>
                    <td className="num">{r.profit_margin_pct != null ? `${r.profit_margin_pct.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine-print">Figures in Indian Rupees (Cr = crore = 1,00,00,000). Source: {data.source}.</p>
        </>
      )}
    </SectionCard>
  );
}
