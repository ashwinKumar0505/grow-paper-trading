import React from 'react';
import { Hint } from './ui';

export default function ScreenerHeader({
  eyebrow,
  title,
  description,
  methodologyNote,
  actions,
  illustration,
}) {
  return (
    <section className="sc-header">
      <div className="sc-header-copy">
        {eyebrow && <div className="sc-header-eyebrow">{eyebrow}</div>}
        <div className="sc-header-title-row">
          <h2>{title}</h2>
          {methodologyNote && <Hint text={methodologyNote} />}
        </div>
        {description && <p className="sc-header-desc">{description}</p>}
      </div>

      <div className="sc-header-right">
        {actions && <div className="sc-header-actions">{actions}</div>}
        {illustration && <div className="sc-header-art">{illustration}</div>}
      </div>
    </section>
  );
}
