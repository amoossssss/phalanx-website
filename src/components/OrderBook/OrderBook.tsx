import { useCallback, useEffect, useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaOrderbook,
  type PacificaOrderbookLevel,
} from '@/utils/helpers/PacificaHelper';
import useNotification from '@/utils/hooks/useNotification';
import { copyToClipboard } from '@/utils/helpers/copyToClipboard';

import './OrderBook.scss';

type OrderBookProps = {
  market: string;
  aggLevel?: 1 | 10 | 100 | 1000 | 10000;
  pricePrecision?: number;
  maxLevels?: number;
};

const formatNumber = (n: number, digits: number) => {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatAmount = (n: number) => {
  return n.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
};

const usdNotional = (level: PacificaOrderbookLevel) => {
  const v = level.price * level.amount;
  return Number.isFinite(v) ? v : 0;
};

const topN = (levels: PacificaOrderbookLevel[], n: number) => {
  return levels.slice(0, n);
};

const OrderBook = ({
  market,
  aggLevel = 1,
  pricePrecision = 2,
  maxLevels = 8,
}: OrderBookProps) => {
  const { snackbar } = useNotification();

  const [book, setBook] = useState<PacificaOrderbook | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const copyPrice = useCallback(
    (price: number) => {
      void copyToClipboard(String(price));
      snackbar.success('Price copied to clipboard');
    },
    [snackbar],
  );

  const { bids, asks, bidRows, askRows } = useMemo(() => {
    const bids = book?.bids ?? [];
    const asks = book?.asks ?? [];
    const bidTop = topN(bids, maxLevels);
    const askTop = topN(asks, maxLevels);

    const bidTotal = bidTop.reduce((acc, l) => acc + usdNotional(l), 0) || 1;
    const askTotal = askTop.reduce((acc, l) => acc + usdNotional(l), 0) || 1;

    let bidCum = 0;
    const bidRows = bidTop.map((l) => {
      bidCum += usdNotional(l);
      return { level: l, cumRatio: Math.min(1, bidCum / bidTotal) };
    });

    // For asks we render visually top-to-bottom as highest->lowest by reversing,
    // but accumulation should still be computed from best price outward (askTop order),
    // then we reverse the rows for display.
    let askCum = 0;
    const askRowsBestFirst = askTop.map((l) => {
      askCum += usdNotional(l);
      return { level: l, cumRatio: Math.min(1, askCum / askTotal) };
    });
    const askRows = askRowsBestFirst.slice().reverse();

    return { bids: bidTop, asks: askTop, bidRows, askRows };
  }, [book, maxLevels]);

  useEffect(() => {
    if (!market) return;
    let cancelled = false;
    setIsLoading(true);
    setBook(null);

    (async () => {
      try {
        const initial = await PacificaHelper.getOrderbook({ market, aggLevel });
        if (cancelled) return;
        setBook(initial);
      } catch (e) {
        console.warn('orderbook rest fetch failed', e);
        if (cancelled) return;
        setBook(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const unsubscribe = PacificaHelper.subscribeOrderbook({
      market,
      aggLevel,
      onBook: (b) => {
        if (cancelled) return;
        setBook(b);
      },
      onError: (e) => console.warn('orderbook websocket error', e),
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [market, aggLevel]);

  return (
    <div className="orderbook">
      <div className="orderbook-header">
        <div className="title">{'Orderbook'}</div>
      </div>

      <div className="orderbook-table">
        <div className="side asks">
          <div className="side-header">{'Asks'}</div>
          <div className="rows">
            {askRows.map(({ level: l, cumRatio }, idx) => (
              <ButtonDiv
                className="row"
                style={{
                  ['--fill' as never]: `${Math.round(cumRatio * 100)}%`,
                }}
                key={`a-${idx}-${l.price}`}
                onClick={() => copyPrice(l.price)}
              >
                <div className="cell price">
                  {formatNumber(l.price, pricePrecision)}
                </div>
                <div className="cell amount">{formatAmount(l.amount)}</div>
                <div className="cell orders">{l.orders}</div>
              </ButtonDiv>
            ))}
            {asks.length === 0 && (
              <div className="empty">{isLoading ? 'Loading…' : '—'}</div>
            )}
          </div>
        </div>

        <div className="side bids">
          <div className="side-header">{'Bids'}</div>
          <div className="rows">
            {bidRows.map(({ level: l, cumRatio }, idx) => (
              <ButtonDiv
                className="row"
                style={{
                  ['--fill' as never]: `${Math.round(cumRatio * 100)}%`,
                }}
                key={`b-${idx}-${l.price}`}
                onClick={() => copyPrice(l.price)}
              >
                <div className="cell price">
                  {formatNumber(l.price, pricePrecision)}
                </div>
                <div className="cell amount">{formatAmount(l.amount)}</div>
                <div className="cell orders">{l.orders}</div>
              </ButtonDiv>
            ))}
            {bids.length === 0 && (
              <div className="empty">{isLoading ? 'Loading…' : '—'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBook;
