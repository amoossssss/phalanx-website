import MarketDropdown from '@/components/MarketDropdown/MarketDropdown';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaMarketInfo,
} from '@/utils/helpers/PacificaHelper';
import useClickOutside from '@/utils/hooks/useClickOutside';

import './MarketSelector.scss';

type MarketSelectorType = {
  selectedMarket: string;
  loadedMarkets: PacificaMarketInfo[];
  setSelectedMarket: (symbol: string) => void;
};

const MarketSelector = ({
  selectedMarket,
  loadedMarkets,
  setSelectedMarket,
}: MarketSelectorType) => {
  const {
    ref,
    isOpen: isMarketDropdownOpen,
    setIsOpen: setIsMarketDropdownOpen,
  } = useClickOutside();

  if (!selectedMarket) return null;

  return (
    <div className="market-selector">
      <ButtonDiv
        className="market-container"
        onClick={() => setIsMarketDropdownOpen(true)}
      >
        <img
          className="token-image"
          src={PacificaHelper.getTokenImage(selectedMarket)}
          alt={'token'}
        />
        <div className="ticker">{selectedMarket}</div>
        {isMarketDropdownOpen && (
          <MarketDropdown
            markets={loadedMarkets}
            close={() => {
              setIsMarketDropdownOpen(false);
            }}
            select={(symbol) => {
              setSelectedMarket(symbol);
              setIsMarketDropdownOpen(false);
            }}
            divRef={ref}
          />
        )}
      </ButtonDiv>
    </div>
  );
};

export default MarketSelector;
