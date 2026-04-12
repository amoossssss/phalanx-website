import { useMemo, useState, RefObject } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaMarketInfo,
} from '@/utils/helpers/PacificaHelper';

import './MarketDropdown.scss';

type MarketDropdownProps = {
  markets: PacificaMarketInfo[];
  /** From `/info/prices` `volume_24h`; higher volume first when sorting. */
  volume24hBySymbol?: Record<string, number>;
  close: () => void;
  select: (marketSymbol: string) => void;
  divRef: RefObject<HTMLDivElement>;
};

const MarketDropdown = ({
  markets,
  volume24hBySymbol,
  close,
  select,
  divRef,
}: MarketDropdownProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const items = useMemo(() => {
    const symbols = markets
      .map((m) => (typeof m.symbol === 'string' ? m.symbol : null))
      .filter((s): s is string => !!s);
    const unique = Array.from(new Set(symbols));
    const vol = volume24hBySymbol ?? {};
    return unique.sort((a, b) => {
      const va = vol[a] ?? 0;
      const vb = vol[b] ?? 0;
      if (vb !== va) return vb - va;
      return a.localeCompare(b);
    });
  }, [markets, volume24hBySymbol]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => s.toLowerCase().includes(q));
  }, [items, searchQuery]);

  return (
    <div className="market-dropdown" ref={divRef}>
      <div
        className="market-dropdown-search"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="search"
          className="market-dropdown-search-input"
          placeholder="Find markets"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search markets"
        />
      </div>
      <div className="dropdown-list" role="menu">
        {items.length === 0 ? (
          <div className="empty">{'Loading…'}</div>
        ) : filteredItems.length === 0 ? (
          <div className="empty">{'No matches'}</div>
        ) : (
          filteredItems.map((symbol) => (
            <ButtonDiv
              key={symbol}
              className="dropdown-row"
              onClick={(event) => {
                event.stopPropagation();
                select(symbol);
                close();
              }}
            >
              <img
                className="dropdown-token-image"
                src={PacificaHelper.getTokenImage(symbol)}
                alt={'token'}
              />
              <div className="dropdown-ticker">{symbol}</div>
            </ButtonDiv>
          ))
        )}
      </div>
    </div>
  );
};

export default MarketDropdown;
