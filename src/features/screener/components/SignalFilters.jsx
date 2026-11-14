import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Hint, Segmented } from './ui';
import { CONFIDENCE_PRESETS } from '../utils/screenerHelpers';

export default function SignalFilters({
  minConfidence,
  onMinConfidenceChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions = [],
  statusLabel = 'Signal status',
  statusHint,
  sectors = [],
  sectorFilter = 'ALL',
  onSectorFilterChange,
  minSlider = 50,
}) {
  const [showSlider, setShowSlider] = useState(false);

  return (
    <div className="sc-filters">
      <div className="sc-filter-group">
        <div className="sc-filter-label-row">
          <label className="filter-label">
            Confidence score{' '}
            <Hint text="Measures how strongly backtested chart patterns and technical indicators align (0–100). It is an analytical score, not a guaranteed win probability." />
          </label>
          <button
            type="button"
            className={`sc-tune-btn ${showSlider ? 'active' : ''}`}
            onClick={() => setShowSlider((v) => !v)}
            title="Fine-tune minimum confidence threshold"
          >
            <SlidersHorizontal size={12} />
            <span>{minConfidence}+</span>
          </button>
        </div>

        <div className="sc-preset-pills" role="group" aria-label="Confidence presets">
          {CONFIDENCE_PRESETS.filter((p) => p.min >= minSlider).map((preset) => {
            const active = minConfidence === preset.min;
            return (
              <button
                key={preset.value}
                type="button"
                className={`sc-preset-pill ${active ? 'active' : ''}`}
                onClick={() => onMinConfidenceChange(preset.min)}
                aria-pressed={active}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {showSlider && (
          <div className="range-row sc-slider-row">
            <input
              type="range"
              min={minSlider}
              max={95}
              step={5}
              value={minConfidence}
              onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
              aria-label="Fine-tune minimum confidence"
              style={{ '--fill': `${((minConfidence - minSlider) / (95 - minSlider)) * 100}%` }}
            />
            <span className="range-value">{minConfidence}+</span>
          </div>
        )}
      </div>

      {statusOptions.length > 0 && (
        <div className="sc-filter-group">
          <label className="filter-label">
            {statusLabel} {statusHint && <Hint text={statusHint} />}
          </label>
          <Segmented
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={statusOptions}
            size="sm"
          />
        </div>
      )}

      {sectors.length > 0 && onSectorFilterChange && (
        <div className="sc-filter-group sc-filter-sector">
          <label className="filter-label" htmlFor="sc-sector-select">
            Sector
          </label>
          <select
            id="sc-sector-select"
            className="sc-select"
            value={sectorFilter}
            onChange={(e) => onSectorFilterChange(e.target.value)}
          >
            <option value="ALL">All sectors ({sectors.length})</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
