import { useCallback, useEffect, useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaOrderHistory,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import '@/components/PositionPanel/PositionsTab/PositionsTab.scss';

const PAGE_LIMIT = 50;

const parseDec = (s: string): number => {
  const n = Number(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};

const formatReason = (reason: string | null): string => {
  if (reason === null || reason === '') return '—';
  return reason.replace(/_/g, ' ');
};

type OrderHistoryTabProps = {
  /** Client-side filter when set (REST has no `symbol` query on this endpoint). */
  selectedMarket?: string;
  /** When true, show orders for all symbols. */
  showAll?: boolean;
  onSelectSymbol?: (symbol: string) => void;
};

const OrderHistoryTab = ({
  selectedMarket = '',
  showAll = false,
  onSelectSymbol,
}: OrderHistoryTabProps) => {
  const { userAddress, isLogin } = useAuth();
  const [orders, setOrders] = useState<PacificaOrderHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const symbolFilter = selectedMarket.trim() || undefined;

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setOrders([]);
      setNextCursor(null);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setNextCursor(null);
    setHasMore(false);

    (async () => {
      try {
        const page = await PacificaHelper.getOrderHistory({
          account,
          limit: PAGE_LIMIT,
        });
        if (!cancelled) {
          setOrders(page.orders);
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
        }
      } catch (e) {
        console.warn('initial order history fetch failed', e);
        if (!cancelled) {
          setOrders([]);
          setNextCursor(null);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLogin, userAddress]);

  const loadMore = useCallback(async () => {
    const account = userAddress;
    if (!account || !nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await PacificaHelper.getOrderHistory({
        account,
        limit: PAGE_LIMIT,
        cursor: nextCursor,
      });
      setOrders((prev) => {
        const map = new Map(prev.map((o) => [o.orderId, o]));
        for (const o of page.orders) {
          map.set(o.orderId, o);
        }
        return Array.from(map.values()).sort(
          (a, b) => b.updatedAtMs - a.updatedAtMs,
        );
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      console.warn('order history pagination failed', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userAddress, nextCursor, isLoadingMore]);

  const rows = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    if (showAll || !symbolFilter) return sorted;
    return sorted.filter((o) => o.symbol === symbolFilter);
  }, [orders, symbolFilter, showAll]);

  if (!isLogin || !userAddress) {
    return (
      <div className="positions-tab-empty">
        {'Connect_wallet_to_view_order_history'}
      </div>
    );
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="positions-tab-empty">{'Loading_order_history…'}</div>
    );
  }

  const colCount = 11;

  return (
    <div className="positions-tab">
      <div className="positions-scroll">
        <table className="positions-table">
          <thead>
            <tr className="positions-header">
              <th className="col updated">{'Updated'}</th>
              <th className="col symbol">{'Token'}</th>
              <th className="col side">{'Side'}</th>
              <th className="col type">{'Type'}</th>
              <th className="col mark">{'Price'}</th>
              <th className="col mark">{'Avg_fill'}</th>
              <th className="col amount">{'Size'}</th>
              <th className="col amount">{'Filled'}</th>
              <th className="col status">{'Status'}</th>
              <th className="col reduce">{'Reduce'}</th>
              <th className="col type">{'Reason'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="positions-row">
                <td className="col symbol" colSpan={colCount}>
                  {'No_orders'}
                </td>
              </tr>
            ) : (
              rows.map((o) => {
                const sideTag = PositionHelper.sideTag(o.side);
                const priceDisplay =
                  o.initialPrice && parseDec(o.initialPrice) > 0
                    ? o.initialPrice
                    : '—';
                const avgDisplay =
                  o.averageFilledPrice && parseDec(o.averageFilledPrice) > 0
                    ? o.averageFilledPrice
                    : '—';
                return (
                  <tr
                    key={`oh-${o.orderId}`}
                    className={`positions-row${
                      onSelectSymbol ? ' is-clickable' : ''
                    }`}
                    onClick={() => {
                      if (o.symbol) onSelectSymbol?.(o.symbol);
                    }}
                  >
                    <td className="col updated">
                      {o.updatedAtMs > 0
                        ? new Date(o.updatedAtMs).toLocaleString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="col symbol">{o.symbol || '—'}</td>
                    <td
                      className={`col side ${
                        o.side === 'bid' ? 'long' : 'short'
                      }`}
                    >
                      {sideTag}
                    </td>
                    <td className="col type">{o.orderType}</td>
                    <td className="col mark">{priceDisplay}</td>
                    <td className="col mark">{avgDisplay}</td>
                    <td className="col amount">{o.amount}</td>
                    <td className="col amount">{o.filledAmount}</td>
                    <td className="col status">{o.orderStatus}</td>
                    <td className="col reduce">
                      {o.reduceOnly ? 'Yes' : 'No'}
                    </td>
                    <td className="col type">{formatReason(o.reason)}</td>
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

export default OrderHistoryTab;
