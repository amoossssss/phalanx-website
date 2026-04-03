import { useCallback, useEffect, useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaTradeHistory,
} from '@/utils/helpers/PacificaHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import '@/components/PositionPanel/PositionsTab/PositionsTab.scss';

const PAGE_LIMIT = 50;

const parseDec = (s: string): number => {
  const n = Number(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};

const formatTradeSide = (side: string): string => {
  const s = String(side ?? '').trim();
  if (!s) return '—';
  return s.replace(/_/g, ' ');
};

const eventTypeLabel = (eventType: string): string => {
  const e = String(eventType ?? '').toLowerCase();
  if (e === 'fulfill_maker') return 'Maker';
  if (e === 'fulfill_taker') return 'Taker';
  return e ? formatTradeSide(e) : '—';
};

const tradeSideCssClass = (side: string): string => {
  const s = String(side ?? '').toLowerCase();
  if (s.includes('long')) return 'long';
  if (s.includes('short')) return 'short';
  return '';
};

const pnlCssClass = (pnl: string): string => {
  const n = parseDec(pnl);
  if (!Number.isFinite(n) || n === 0) return '';
  return n > 0 ? 'long' : 'short';
};

type TradingHistoryTabProps = {
  /** When set, REST and websocket rows are limited to this market symbol. */
  selectedMarket?: string;
  onSelectSymbol?: (symbol: string) => void;
};

const TradingHistoryTab = ({
  selectedMarket = '',
  onSelectSymbol,
}: TradingHistoryTabProps) => {
  const { userAddress, isLogin } = useAuth();
  const [trades, setTrades] = useState<PacificaTradeHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const symbolFilter = selectedMarket.trim() || undefined;

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setTrades([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setIsLoading(true);
    setNextCursor(null);
    setHasMore(false);

    (async () => {
      try {
        const page = await PacificaHelper.getTradeHistory({
          account,
          symbol: symbolFilter,
          limit: PAGE_LIMIT,
        });
        if (!cancelled) {
          setTrades(page.trades);
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
        }
      } catch (e) {
        console.warn('initial trade history fetch failed', e);
        if (!cancelled) {
          setTrades([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountTrades({
      account,
      onTrades: (rows) => {
        if (cancelled) return;
        const filtered = symbolFilter
          ? rows.filter((r) => String(r.s ?? '') === symbolFilter)
          : rows;
        if (filtered.length === 0) return;
        setTrades((prev) =>
          PacificaHelper.mergeTradeHistoryAfterWs(prev, filtered, account),
        );
      },
      onError: (e) => {
        console.warn('account trades websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress, symbolFilter]);

  const loadMore = useCallback(async () => {
    const account = userAddress;
    if (!account || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await PacificaHelper.getTradeHistory({
        account,
        symbol: symbolFilter,
        limit: PAGE_LIMIT,
        cursor: nextCursor,
      });
      setTrades((prev) => {
        const map = new Map(prev.map((t) => [t.historyId, t]));
        for (const t of page.trades) {
          map.set(t.historyId, t);
        }
        return Array.from(map.values()).sort(
          (a, b) => b.createdAtMs - a.createdAtMs,
        );
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      console.warn('trade history pagination failed', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userAddress, nextCursor, symbolFilter, isLoadingMore]);

  const rows = useMemo(
    () => [...trades].sort((a, b) => b.createdAtMs - a.createdAtMs),
    [trades],
  );

  if (!isLogin || !userAddress) {
    return (
      <div className="positions-tab-empty">
        {'Connect_wallet_to_view_trade_history'}
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return (
      <div className="positions-tab-empty">{'Loading_trade_history…'}</div>
    );
  }

  const colCount = 10;

  return (
    <div className="positions-tab">
      <div className="positions-scroll">
        <table className="positions-table">
          <thead>
            <tr className="positions-header">
              <th className="col updated">{'Time'}</th>
              <th className="col symbol">{'Token'}</th>
              <th className="col side">{'Side'}</th>
              <th className="col type">{'Type'}</th>
              <th className="col amount">{'Size'}</th>
              <th className="col mark">{'Price'}</th>
              <th className="col mark">{'Entry'}</th>
              <th className="col amount">{'Fee'}</th>
              <th className="col amount">{'PnL'}</th>
              <th className="col status">{'Cause'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="positions-row">
                <td className="col symbol" colSpan={colCount}>
                  {'No_trades'}
                </td>
              </tr>
            ) : (
              rows.map((t) => {
                const sideClass = tradeSideCssClass(t.side);
                const pnlClass = pnlCssClass(t.pnl);
                return (
                  <tr
                    key={`th-${t.historyId}`}
                    className={`positions-row${
                      onSelectSymbol ? ' is-clickable' : ''
                    }`}
                    onClick={() => {
                      if (t.symbol) onSelectSymbol?.(t.symbol);
                    }}
                  >
                    <td className="col updated">
                      {t.createdAtMs > 0
                        ? new Date(t.createdAtMs).toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="col symbol">{t.symbol || '—'}</td>
                    <td className={`col side ${sideClass}`.trim()}>
                      {formatTradeSide(t.side)}
                    </td>
                    <td className="col type">{eventTypeLabel(t.eventType)}</td>
                    <td className="col amount">{t.amount}</td>
                    <td className="col mark">{t.price}</td>
                    <td className="col mark">{t.entryPrice}</td>
                    <td className="col amount">{t.fee}</td>
                    <td className={`col amount ${pnlClass}`.trim()}>{t.pnl}</td>
                    <td className="col status">{formatTradeSide(t.cause)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {hasMore && nextCursor ? (
        <div className="positions-tab-footer">
          <ButtonDiv
            className="close-btn"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
          >
            {isLoadingMore ? 'Loading…' : 'Load_more'}
          </ButtonDiv>
        </div>
      ) : null}
    </div>
  );
};

export default TradingHistoryTab;
