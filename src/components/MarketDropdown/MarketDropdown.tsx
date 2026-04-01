import { useMemo, RefObject } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaMarketInfo,
} from '@/utils/helpers/PacificaHelper';

import './MarketDropdown.scss';

type MarketDropdownProps = {
  markets: PacificaMarketInfo[];
  close: () => void;
  select: (marketSymbol: string) => void;
  divRef: RefObject<HTMLDivElement>;
};

const MarketDropdown = ({
  markets,
  close,
  select,
  divRef,
}: MarketDropdownProps) => {
  const items = useMemo(() => {
    const symbols = markets
      .map((m) => (typeof m.symbol === 'string' ? m.symbol : null))
      .filter((s): s is string => !!s);
    return Array.from(new Set(symbols)).sort();
  }, [markets]);

  return (
    <div className="market-dropdown" ref={divRef}>
      <div className="dropdown-list" role="menu">
        {items.length === 0 ? (
          <div className="empty">{'Loading…'}</div>
        ) : (
          items.map((symbol) => (
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
