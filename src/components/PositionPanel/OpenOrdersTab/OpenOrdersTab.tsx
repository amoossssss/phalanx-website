import { useEffect, useMemo, useState } from 'react';

import ConfirmCancelOrderDialog from '@/components/ConfirmCancelOrderDialog/ConfirmCancelOrderDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaOpenOrder,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import '@/components/PositionPanel/PositionsTab/PositionsTab.scss';

const parseDec = (s: string): number => {
  const n = Number(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : NaN;
};

const orderRemainingDisplay = (o: PacificaOpenOrder): string => {
  const ini = parseDec(o.initialAmount);
  const fill = parseDec(o.filledAmount);
  const canc = parseDec(o.cancelledAmount);
  if (!Number.isFinite(ini)) return '—';
  const f = Number.isFinite(fill) ? fill : 0;
  const c = Number.isFinite(canc) ? canc : 0;
  const r = ini - f - c;
  if (!Number.isFinite(r) || r < 0) return '0';
  return r.toLocaleString(undefined, { maximumFractionDigits: 8 });
};

type OpenOrdersTabProps = {
  onSelectSymbol?: (symbol: string) => void;
};

const OpenOrdersTab = ({ onSelectSymbol }: OpenOrdersTabProps) => {
  const { userAddress, isLogin } = useAuth();
  const [orders, setOrders] = useState<PacificaOpenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<PacificaOpenOrder | null>(
    null,
  );

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setOrders([]);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setIsLoading(true);

    (async () => {
      try {
        const initial = await PacificaHelper.getOpenOrders({ account });
        if (!cancelled) setOrders(initial);
      } catch (e) {
        console.warn('initial open orders fetch failed', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountOrderUpdates({
      account,
      onOrderEvents: (rows) => {
        if (cancelled) return;
        setOrders((prev) => PacificaHelper.mergeOpenOrdersAfterWs(prev, rows));
      },
      onError: (e) => {
        console.warn('account order updates websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress]);

  const rows = useMemo(
    () => [...orders].sort((a, b) => b.updatedAtMs - a.updatedAtMs),
    [orders],
  );

  if (!isLogin || !userAddress) {
    return (
      <div className="positions-tab-empty">
        {'Connect_wallet_to_view_open_orders'}
      </div>
    );
  }

  if (isLoading && rows.length === 0) {
    return <div className="positions-tab-empty">{'Loading_open_orders…'}</div>;
  }

  return (
    <div className="positions-tab">
      {cancelTarget ? (
        <ConfirmCancelOrderDialog
          order={cancelTarget}
          close={() => setCancelTarget(null)}
          onCancelled={(o) => {
            setOrders((prev) =>
              prev.filter((x) => {
                if (o.orderId > 0 && x.orderId === o.orderId) return false;
                if (
                  o.clientOrderId &&
                  x.clientOrderId &&
                  x.clientOrderId === o.clientOrderId
                ) {
                  return false;
                }
                return true;
              }),
            );
          }}
        />
      ) : null}
      <div className="positions-scroll">
        <table className="positions-table">
          <thead>
            <tr className="positions-header">
              <th className="col symbol">{'Token'}</th>
              <th className="col side">{'Side'}</th>
              <th className="col type">{'Type'}</th>
              <th className="col mark">{'Price'}</th>
              <th className="col amount">{'Size'}</th>
              <th className="col amount">{'Filled'}</th>
              <th className="col amount">{'Remaining'}</th>
              <th className="col reduce">{'Reduce'}</th>
              <th className="col status">{'Status'}</th>
              <th className="col updated">{'Updated'}</th>
              <th className="col actions">{'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="positions-row">
                <td className="col symbol" colSpan={11}>
                  {'No_open_orders'}
                </td>
              </tr>
            ) : (
              rows.map((o) => {
                const sideTag = PositionHelper.sideTag(o.side);
                const rowKey =
                  o.orderId > 0
                    ? `oid-${o.orderId}`
                    : `cloid-${o.clientOrderId ?? o.symbol}`;
                return (
                  <tr
                    key={rowKey}
                    className={`positions-row${
                      onSelectSymbol ? ' is-clickable' : ''
                    }`}
                    onClick={() => {
                      if (o.symbol) onSelectSymbol?.(o.symbol);
                    }}
                  >
                    <td className="col symbol">{o.symbol}</td>
                    <td
                      className={`col side ${
                        o.side === 'bid' ? 'long' : 'short'
                      }`}
                    >
                      {sideTag}
                    </td>
                    <td className="col type">{o.orderType}</td>
                    <td className="col mark">
                      {o.price && parseDec(o.price) > 0 ? o.price : '—'}
                    </td>
                    <td className="col amount">{o.initialAmount}</td>
                    <td className="col amount">{o.filledAmount}</td>
                    <td className="col amount">{orderRemainingDisplay(o)}</td>
                    <td className="col reduce">
                      {o.reduceOnly ? 'Yes' : 'No'}
                    </td>
                    <td className="col status">{o.orderStatus}</td>
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
                    <td className="col actions">
                      <ButtonDiv
                        className="close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCancelTarget(o);
                        }}
                      >
                        {'Cancel'}
                      </ButtonDiv>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OpenOrdersTab;
