import { useEffect, useMemo, useState } from 'react';

import CandleChart from '@/components/CandleChart/CandleChart';
import MarketSelector from '@/components/MarketSelector/MarketSelector';
import OrderBook from '@/components/OrderBook/OrderBook';
import OrderPanel from '@/components/OrderPanel/OrderPanel';
import PositionPanel from '@/components/PositionPanel/PositionPanel';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import { useAuth } from '@/utils/contexts/AuthContext';
import PacificaHelper, {
  type PacificaAccountInfo,
  type PacificaMarketInfo,
} from '@/utils/helpers/PacificaHelper';

import './TradingPanel.scss';

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

type TradingPanelProps = {
  /** Optional override (e.g. cached markets or server-provided) */
  markets?: PacificaMarketInfo[];
  initialMarket?: string;
  onMarketChange?: (market: string) => void;
};

// TODO: modify route query, '?market=<ticker>'
// TODO: init the selectedMarket as <ticker>
const TradingPanel = ({
  markets,
  initialMarket,
  onMarketChange,
}: TradingPanelProps) => {
  const { userAddress, isLogin } = useAuth();
  const [loadedMarkets, setLoadedMarkets] = useState<PacificaMarketInfo[]>(
    markets ?? [],
  );
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [accountInfo, setAccountInfo] = useState<PacificaAccountInfo | null>(
    null,
  );

  const selectedMarketData = useMemo(() => {
    if (!loadedMarkets) return null;
    if (!selectedMarket) return null;
    return loadedMarkets.find((m) => m.symbol === selectedMarket) ?? null;
  }, [loadedMarkets, selectedMarket]);

  const pricePrecision = useMemo(() => {
    const tick = selectedMarketData?.tick_size;
    const tickStr = typeof tick === 'number' ? String(tick) : tick;
    if (!tickStr) return 2;
    const dot = tickStr.indexOf('.');
    return dot === -1 ? 0 : Math.max(0, tickStr.length - dot - 1);
  }, [selectedMarketData]);

  const maxLeverage = useMemo(() => {
    const raw = selectedMarketData?.max_leverage;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 50;
    return Math.max(1, Math.floor(n));
  }, [selectedMarketData]);

  const lotSize = useMemo(() => {
    const raw = selectedMarketData?.lot_size;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return n;
  }, [selectedMarketData]);

  useEffect(() => {
    if (markets) {
      setLoadedMarkets(markets);
    }
  }, [markets]);

  useEffect(() => {
    let cancelled = false;
    if (markets) return;
    (async () => {
      try {
        const markets = await PacificaHelper.getMarkets();
        if (cancelled) return;
        setLoadedMarkets(markets);
      } catch (e) {
        console.error(e);
        if (cancelled) return;
        setLoadedMarkets([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [markets]);

  const marketOptions = useMemo(() => {
    const symbols = loadedMarkets
      .map((m) => (typeof m.symbol === 'string' ? m.symbol : null))
      .filter((s): s is string => !!s);
    return Array.from(new Set(symbols));
  }, [loadedMarkets]);

  useEffect(() => {
    if (selectedMarket) return;
    if (initialMarket) {
      setSelectedMarket(initialMarket);
      return;
    }
    if (marketOptions.length > 0) {
      const first = marketOptions[0];
      if (first) setSelectedMarket(first);
    }
  }, [marketOptions, selectedMarket, initialMarket]);

  useEffect(() => {
    if (!selectedMarket) return;
    onMarketChange?.(selectedMarket);
  }, [selectedMarket, onMarketChange]);

  useEffect(() => {
    if (!selectedMarket) return;
    setLatestPrice(null);

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await PacificaHelper.getMarketPrice({
          market: selectedMarket,
        });
        if (cancelled) return;
        if (initial !== null) setLatestPrice(initial);
      } catch (e) {
        // Non-fatal; websocket will still populate
        console.warn('initial market price fetch failed', e);
      }
    })();

    unsubscribe = PacificaHelper.subscribeLastPrice({
      market: selectedMarket,
      onPrice: (p) => setLatestPrice(p),
      onError: (e) => console.warn('last price websocket error', e),
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [selectedMarket]);

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setAccountInfo(null);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await PacificaHelper.getAccountInfo({ account });
        if (cancelled) return;
        setAccountInfo(initial);
      } catch (e) {
        console.warn('initial account info fetch failed', e);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountInfo({
      account,
      onInfo: (info) => {
        if (cancelled) return;
        setAccountInfo((prev) => ({
          ...info,
          makerFee: prev?.makerFee ?? info.makerFee,
          takerFee: prev?.takerFee ?? info.takerFee,
        }));
      },
      onError: (e) => console.warn('account info websocket error', e),
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress]);

  return (
    <div className="trading-panel">
      <div className="chart-header">
        <div className="market">
          <div className="market-and-price">
            <MarketSelector
              loadedMarkets={loadedMarkets}
              selectedMarket={selectedMarket}
              setSelectedMarket={setSelectedMarket}
            />
            <div className="panel-info-item">
              <div className="panel-info-label">{'Price'}</div>
              <div className="latest-price">
                {latestPrice === null
                  ? '—'
                  : latestPrice.toLocaleString(undefined, {
                      minimumFractionDigits: pricePrecision,
                      maximumFractionDigits: pricePrecision,
                    })}
              </div>
            </div>
          </div>
        </div>
        <div className="timeframe">
          {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((tf) => (
            <ButtonDiv
              key={tf}
              className={tf === timeframe ? 'tf-btn active' : 'tf-btn'}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </ButtonDiv>
          ))}
        </div>
      </div>
      <div className="panel-content">
        <div className="left-section">
          <div className="top-section">
            <div className="chart-canvas">
              <CandleChart
                key={selectedMarket}
                market={selectedMarket}
                resolution={timeframe}
                height={460}
                pricePrecision={pricePrecision}
              />
            </div>

            <div className="side-panels">
              <OrderBook
                market={selectedMarket}
                aggLevel={1}
                pricePrecision={pricePrecision}
                maxLevels={7}
              />
            </div>
          </div>

          <PositionPanel markets={loadedMarkets} />
        </div>
        <div className="right-section">
          <OrderPanel
            market={selectedMarket}
            lotSize={lotSize}
            availableBalance={accountInfo?.availableToSpend ?? 0}
            maxLeverage={maxLeverage}
            accountInfo={accountInfo}
          />
        </div>
      </div>
    </div>
  );
};

export default TradingPanel;
