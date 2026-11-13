import React from 'react';
import { Info } from 'lucide-react';
import { confidenceLevel } from '../utils/format';

export function Badge({ tone = 'neutral', children, title, icon: Icon }) {
  return (
    <span className={`badge tone-${tone}`} title={title}>
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

export function ConfidenceMeter({ score, compact = false }) {
  const s = Math.max(0, Math.min(100, Number(score) || 0));
  const lvl = confidenceLevel(s);
  return (
    <div className={`conf-meter conf-${lvl.tone} ${compact ? 'compact' : ''}`}>
      <div className="conf-top">
        <span className="conf-num">{Math.round(s)}</span>
        <span className="conf-label">{lvl.label}</span>
      </div>
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange, size = 'md' }) {
  return (
    <div className={`segmented seg-${size}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          type="button"
        >
          {o.icon && <o.icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Hint({ text }) {
  return (
    <span className="hint" tabIndex={0} aria-label={text}>
      <Info size={13} />
      <span className="hint-bubble">{text}</span>
    </span>
  );
}

export function StatCard({ label, value, sub, tone, icon: Icon }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-card-label">
        {Icon && <Icon size={14} />}
        {label}
      </div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = '', flush = false }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'card-body flush' : 'card-body'}>{children}</div>
    </section>
  );
}
