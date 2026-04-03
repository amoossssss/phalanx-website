import { useEffect, useMemo, useState } from 'react';

import ExitPositionDialog from '@/components/ExitPositionDialog/ExitPositionDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import PacificaHelper, {
  type PacificaMarketInfo,
  type PacificaPosition,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import './PositionsTab.scss';

type PositionsTabProps = {
  markets?: PacificaMarketInfo[];
};

const PositionsTab = ({ markets }: PositionsTabProps) => {
  const { userAddress, isLogin } = useAuth();

  const [positions, setPositions] = useState<PacificaPosition[]>([]);
  const [exitTarget, setExitTarget] = useState<PacificaPosition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markBySymbol, setMarkBySymbol] = useState<Record<string, number>>({});
  const [leverageBySymbol, setLeverageBySymbol] = useState<
    Record<string, number>
  >({});

  const lotSizeBySymbol = useMemo(() => {
    const next: Record<string, number> = {};
    if (!markets?.length) return next;
    for (const m of markets) {
      const sym = m.symbol;
      if (!sym) continue;
      const raw = m.lot_size;
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n) && n > 0) next[sym] = n;
    }
    return next;
  }, [markets]);

  const tickSizeBySymbol = useMemo(() => {
    const next: Record<string, number> = {};
    if (!markets?.length) return next;
    for (const m of markets) {
      const sym = m.symbol;
      if (!sym) continue;
      const raw = m.tick_size;
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n) && n > 0) next[sym] = n;
    }
    return next;
  }, [markets]);

  const positionSymbolsKey = useMemo(
    () =>
      Array.from(
        new Set(
          positions
            .map((p) => p.symbol)
            .filter((s): s is string => typeof s === 'string' && s.length > 0),
        ),
      )
        .sort()
        .join(','),
    [positions],
  );

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    setIsLoading(true);

    (async () => {
      try {
        const initial = await PacificaHelper.getPositions({ account });
        if (!cancelled) {
          setPositions(initial);
        }
      } catch (e) {
        console.warn('initial positions fetch failed', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountPositions({
      account,
      onPositions: (next) => {
        if (cancelled) return;
        setPositions(next);
      },
      onError: (e) => {
        console.warn('account positions websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress]);

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setLeverageBySymbol({});
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const settings = await PacificaHelper.getAccountSettings({ account });
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const row of settings.marginSettings) {
          if (row.symbol && row.leverage > 0) {
            next[row.symbol] = row.leverage;
          }
        }
        setLeverageBySymbol(next);
      } catch (e) {
        console.warn('get account settings failed', e);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountLeverage({
      account,
      onLeverage: (u) => {
        if (cancelled || !u.symbol || u.leverage <= 0) return;
        setLeverageBySymbol((prev) => ({
          ...prev,
          [u.symbol]: u.leverage,
        }));
      },
      onError: (e) => {
        console.warn('account leverage websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress]);

  useEffect(() => {
    if (!positionSymbolsKey) {
      setMarkBySymbol({});
      return;
    }

    const symbols = positionSymbolsKey.split(',').filter(Boolean);
    let cancelled = false;

    (async () => {
      const entries = await Promise.all(
        symbols.map(async (sym) => {
          const price = await PacificaHelper.getMarketPrice({ market: sym });
          return [sym, price] as const;
        }),
      );
      if (cancelled) return;
      setMarkBySymbol((prev) => {
        const next = { ...prev };
        for (const [sym, price] of entries) {
          if (price !== null) next[sym] = price;
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [positionSymbolsKey]);

  useEffect(() => {
    if (!positionSymbolsKey) return;

    const symbolSet = new Set(positionSymbolsKey.split(',').filter(Boolean));

    const unsubscribe = PacificaHelper.subscribePrices({
      onPrices: (rows) => {
        setMarkBySymbol((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const row of rows) {
            if (!row?.symbol || !symbolSet.has(row.symbol)) continue;
            const p = PacificaHelper.getPriceFromPricesRow(row);
            if (p !== null && next[row.symbol] !== p) {
              next[row.symbol] = p;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      onError: (e) => {
        console.warn('positions tab prices websocket error', e);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [positionSymbolsKey]);

  if (!isLogin || !userAddress) {
    return (
      <div className="positions-tab-empty">
        {'Connect_wallet_to_view_positions'}
      </div>
    );
  }

  if (isLoading && positions.length === 0) {
    return <div className="positions-tab-empty">{'Loading_positions…'}</div>;
  }

  return (
    <div className="positions-tab">
      {exitTarget ? (
        <ExitPositionDialog
          position={exitTarget}
          markPrice={
            markBySymbol[exitTarget.symbol] !== undefined &&
            Number.isFinite(markBySymbol[exitTarget.symbol])
              ? markBySymbol[exitTarget.symbol]
              : null
          }
          lotSize={lotSizeBySymbol[exitTarget.symbol] ?? 1}
          tickSize={tickSizeBySymbol[exitTarget.symbol]}
          close={() => setExitTarget(null)}
        />
      ) : null}
      <div className="positions-scroll">
        <table className="positions-table">
          <thead>
            <tr className="positions-header">
              <th className="col symbol">{'Token'}</th>
              <th className="col side">{'Side'}</th>
              <th className="col amount">{'Size'}</th>
              <th className="col value">{'Value'}</th>
              <th className="col entry">{'Entry'}</th>
              <th className="col mark">{'Mark'}</th>
              <th className="col pnl">{'PnL_ROI'}</th>
              <th className="col liq">{'Liquidation'}</th>
              <th className="col margin">{'Margin'}</th>
              <th className="col actions">{'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => {
              const mark = markBySymbol[p.symbol];
              const valueUsd =
                mark !== undefined && Number.isFinite(mark)
                  ? PositionHelper.positionNotionalUsd(p.amount, mark)
                  : null;

              const pnlUsd =
                mark !== undefined && Number.isFinite(mark)
                  ? PositionHelper.unrealizedPnlUsd(
                      p.side,
                      p.amount,
                      p.entryPrice,
                      mark,
                    )
                  : null;

              const lev = PositionHelper.leverageForPosition({
                position: p,
                markPrice: mark,
                leverageBySymbol,
              });
              const marginUsd =
                valueUsd !== null && lev !== null && lev > 0
                  ? valueUsd / lev
                  : null;
              const baseRoiPct =
                pnlUsd !== null
                  ? PositionHelper.unrealizedRoiPct({
                      pnlUsd,
                      entryPrice: p.entryPrice,
                      amount: p.amount,
                      margin: p.margin,
                    })
                  : null;
              const roiPct =
                baseRoiPct !== null && lev !== null && lev > 0
                  ? baseRoiPct * lev
                  : baseRoiPct;
              const sideTag = PositionHelper.sideTag(p.side);
              const sideLabel = lev !== null ? `${lev}x_${sideTag}` : sideTag;

              return (
                <tr key={`${p.symbol}-${p.side}`} className="positions-row">
                  <td className="col symbol">{p.symbol}</td>
                  <td className={`col side ${PositionHelper.sideTag(p.side)}`}>
                    {sideLabel}
                  </td>
                  <td className="col amount">
                    {p.amount.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}
                  </td>
                  <td className="col value">
                    {valueUsd !== null
                      ? `$${valueUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—'}
                  </td>
                  <td className="col entry">
                    {p.entryPrice.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="col mark">
                    {mark !== undefined && Number.isFinite(mark)
                      ? mark.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : '—'}
                  </td>
                  <td
                    className={`col pnl ${
                      pnlUsd === null
                        ? ''
                        : pnlUsd >= 0
                        ? 'positive'
                        : 'negative'
                    }`}
                  >
                    {pnlUsd !== null && roiPct !== null
                      ? `${pnlUsd >= 0 ? '+' : '-'}$${Math.abs(
                          pnlUsd,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} (${roiPct >= 0 ? '+' : ''}${roiPct.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}%)`
                      : pnlUsd !== null
                      ? `${pnlUsd >= 0 ? '+' : '-'}$${Math.abs(
                          pnlUsd,
                        ).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : '—'}
                  </td>
                  <td className="col liq">
                    {p.liquidationPrice !== null
                      ? p.liquidationPrice.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : '—'}
                  </td>
                  <td className="col margin">
                    {marginUsd !== null
                      ? `$${marginUsd.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} (${p.isolated ? 'Isolated' : 'Cross'})`
                      : `${p.margin.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })} (${p.isolated ? 'Isolated' : 'Cross'})`}
                  </td>
                  <td className="col actions">
                    <ButtonDiv
                      className="close-btn"
                      onClick={() => setExitTarget(p)}
                    >
                      {'Close'}
                    </ButtonDiv>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionsTab;
