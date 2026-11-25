import {
RefreshCw,
Search,
X
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

const POPULAR = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'TATAMOTORS'];
const analysisMemo = {};

const toneFor = (sig) => (sig === 'BULLISH' ? 'positive' : sig === 'BEARISH' ? 'negative' : 'neutral');



export function AnalysisSearch({ query, setQuery, suggestions, showDropdown, setShowDropdown, activeIdx, setActiveIdx, loading, loadingSym, inputRef, load, onKeyDown, clear, a }) {
  return <>
      {/* Search Bar */}
      <section className="card search-card">
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            load(activeIdx >= 0 && suggestions[activeIdx] ? suggestions[activeIdx].symbol : query);
          }}
        >
          <div className="search-box">
            <Search size={18} className="search-ico" />
            <Input unstyled
              ref={inputRef}
              type="text"
              placeholder="Search stock name or symbol, e.g. Reliance, TCS, HDFC Bank…"
              value={query}
              aria-label="Search Nifty 500 stock"
              aria-expanded={showDropdown && suggestions.length > 0}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 160)}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
                setActiveIdx(-1);
              }}
            />
            {query && (
              <Button variant="unstyled" size="unstyled" type="button" className="icon-btn search-clear" onClick={clear} aria-label="Clear search">
                <X size={16} />
              </Button>
            )}
            {showDropdown && suggestions.length > 0 && (
              <ul className="search-dd" role="listbox">
                {suggestions.map((s, i) => (
                  <li
                    key={s.symbol}
                    role="option"
                    aria-selected={i === activeIdx}
                    className={i === activeIdx ? 'active' : ''}
                    onMouseDown={() => load(s.symbol)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <div className="stock-avatar sm">{s.symbol.slice(0, 2)}</div>
                    <div className="dd-text">
                      <strong>{s.symbol}</strong>
                      <span>{s.name}</span>
                    </div>
                    <span className="dd-sector">{s.sector}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="unstyled" size="unstyled" type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
            {loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
            <span>{loading ? 'Analysing…' : 'Analyse'}</span>
          </Button>
        </form>

        <div className="popular">
          <span>Popular:</span>
          {POPULAR.map((s) => (
            <Button variant="unstyled" size="unstyled"
              key={s}
              className={`chip-btn ${a?.symbol === s ? 'active' : ''}`}
              onClick={() => load(s)}
              type="button"
              disabled={loading && loadingSym === s}
            >
              {s}
            </Button>
          ))}
        </div>
      </section>


  </>;
}
