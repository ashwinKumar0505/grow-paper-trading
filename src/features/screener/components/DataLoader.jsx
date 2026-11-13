import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

export default function DataLoader({ title = 'Loading…', subtitle = '', stages = [] }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (stages.length <= 1) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, stages.length - 1)), 1800);
    return () => clearInterval(t);
  }, [stages]);

  const pct = stages.length ? Math.min(92, Math.round(((step + 1) / stages.length) * 90)) : 60;

  return (
    <div className="loader">
      <div className="loader-spinner" />
      <h4 className="loader-title">{title}</h4>
      {subtitle && <p className="loader-sub">{subtitle}</p>}
      <div className="loader-bar">
        <div className="loader-fill" style={{ width: `${pct}%` }} />
      </div>
      {stages.length > 0 && (
        <ul className="loader-steps">
          {stages.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''}>
              <span className="ls-icon">{i < step ? <Check size={11} strokeWidth={3} /> : null}</span>
              {s}
            </li>
          ))}
        </ul>
      )}
      <span className="loader-time">{elapsed}s</span>
    </div>
  );
}
