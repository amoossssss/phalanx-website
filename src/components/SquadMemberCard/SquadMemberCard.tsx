import { useEffect, useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ColorHelper from '@/utils/helpers/ColorHelper';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import PacificaHelper, {
  type PacificaMarketPriceRow,
  PacificaPosition,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import { MemberType } from '@/utils/constants/Types';
import { copyToClipboard } from '@/utils/helpers/copyToClipboard';

import './SquadMemberCard.scss';

type SquadMemberCardType = {
  member: MemberType;
  canKick: boolean;
  onKickMember: (member: MemberType) => void;
  squadColor: string;
  /** From parent `getMarkets()` — symbol → tick_size for price display */
  tickBySymbol: Record<string, string | number>;
  /** From parent `getMarkets()` — symbol → max_leverage (fallback when account leverage is unknown) */
  maxLeverageBySymbol: Record<string, number>;
};

const SquadMemberCard = ({
  member,
  canKick,
  onKickMember,
  squadColor,
  tickBySymbol,
  maxLeverageBySymbol,
}: SquadMemberCardType) => {
  const { snackbar } = useNotification();

  const [isExpand, setIsExpand] = useState(false);
  const [positions, setPositions] = useState<PacificaPosition[]>([]);
  const [headerPositionCount, setHeaderPositionCount] = useState<number | null>(
    null,
  );
  const [markBySymbol, setMarkBySymbol] = useState<Record<string, number>>({});
  const [leverageBySymbol, setLeverageBySymbol] = useState<
    Record<string, number>
  >({});
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  const volume = member.volume ?? 0;
  const pnl = member.pnl ?? 0;

  const borderColor = ColorHelper.borderColor(squadColor);

  const copyWalletAddress = async () => {
    await copyToClipboard(member.walletAddress);
    snackbar.success('Wallet address copied to clipboard');
  };

  useEffect(() => {
    let cancelled = false;
    void PacificaHelper.getAccountInfo({ account: member.walletAddress })
      .then((info) => {
        if (!cancelled) setHeaderPositionCount(info.positionsCount);
      })
      .catch(() => {
        if (!cancelled) setHeaderPositionCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [member.walletAddress]);

  useEffect(() => {
    if (headerPositionCount === 0) {
      setIsExpand(false);
    }
  }, [headerPositionCount]);

  useEffect(() => {
    if (!isExpand) {
      setPositions([]);
      setMarkBySymbol({});
      return;
    }

    let cancelled = false;
    let unsubPositions: (() => void) | null = null;

    setIsLoadingPositions(true);
    void (async () => {
      try {
        const initial = await PacificaHelper.getPositions({
          account: member.walletAddress,
        });
        if (!cancelled) setPositions(initial);
      } catch (e) {
        console.warn('squad member initial positions failed', e);
      } finally {
        if (!cancelled) setIsLoadingPositions(false);
      }
    })();

    unsubPositions = PacificaHelper.subscribeAccountPositions({
      account: member.walletAddress,
      onPositions: (next) => {
        if (!cancelled) {
          setPositions(next);
          setHeaderPositionCount(next.length);
        }
      },
      onError: (e) => {
        console.warn('squad member positions ws', e);
      },
    });

    return () => {
      cancelled = true;
      unsubPositions?.();
    };
  }, [isExpand, member.walletAddress]);

  useEffect(() => {
    if (!isExpand) {
      setLeverageBySymbol({});
      return;
    }

    const account = member.walletAddress;
    let cancelled = false;
    let unsubLeverage: (() => void) | null = null;

    void (async () => {
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
        console.warn('squad member getAccountSettings failed', e);
      }
    })();

    unsubLeverage = PacificaHelper.subscribeAccountLeverage({
      account,
      onLeverage: (u) => {
        if (cancelled || !u.symbol || u.leverage <= 0) return;
        setLeverageBySymbol((prev) => ({
          ...prev,
          [u.symbol]: u.leverage,
        }));
      },
      onError: (e) => {
        console.warn('squad member account leverage ws', e);
      },
    });

    return () => {
      cancelled = true;
      unsubLeverage?.();
    };
  }, [isExpand, member.walletAddress]);

  const positionSymbolsKey = useMemo(
    () =>
      Array.from(
        new Set(
          positions
            .map((p) => p.symbol)
            .filter((s): s is string => s.length > 0),
        ),
      )
        .sort()
        .join(','),
    [positions],
  );

  useEffect(() => {
    if (!isExpand || !positionSymbolsKey) {
      return;
    }

    const symbols = positionSymbolsKey.split(',').filter(Boolean);
    let cancelled = false;

    void (async () => {
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
  }, [isExpand, positionSymbolsKey]);

  useEffect(() => {
    if (!isExpand || !positionSymbolsKey) return;

    const symbolSet = new Set(positionSymbolsKey.split(',').filter(Boolean));
    if (symbolSet.size === 0) return;

    const unsubscribe = PacificaHelper.subscribePrices({
      onPrices: (rows) => {
        setMarkBySymbol((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const row of rows) {
            if (!row?.symbol || !symbolSet.has(row.symbol)) continue;
            const p = PacificaHelper.getPriceFromPricesRow(
              row as PacificaMarketPriceRow,
            );
            if (p !== null && next[row.symbol] !== p) {
              next[row.symbol] = p;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      onError: (e) => {
        console.warn('squad member mark prices ws', e);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [isExpand, positionSymbolsKey]);

  const openCountDisplay =
    isExpand && positions.length > 0
      ? positions.length
      : headerPositionCount ?? '—';

  const showExpandButton =
    headerPositionCount !== null && headerPositionCount > 0;

  return (
    <div className="squad-member-card" style={{ borderColor }}>
      <div className="top-section">
        {member.alias ? (
          <div className="name-container">
            <div className="main-name">
              <span className="main-name__text">{`@${member.alias}`}</span>
            </div>
            <ButtonDiv className="sub-name" onClick={copyWalletAddress}>
              <span className="sub-name__text">
                {StringHelper.truncateAddress(member.walletAddress)}
              </span>
            </ButtonDiv>
            <div className="open_positions">{`> Open_positions_count: ${openCountDisplay}`}</div>
          </div>
        ) : (
          <div className="name-container">
            <ButtonDiv className="main-name" onClick={copyWalletAddress}>
              <span className="main-name__text">{`@${StringHelper.truncateAddress(
                member.walletAddress,
              )}`}</span>
            </ButtonDiv>
            <div className="open_positions">{`> Open_positions_count: ${openCountDisplay}`}</div>
          </div>
        )}

        <div className="squad-earnings">
          <div className="earnings-item volume">
            <div>{'Total_Volume'}</div>
            <div className="earnings-number">
              {StringHelper.formatCompactNumber(volume)}
            </div>
          </div>

          <div className="earnings-item pnl">
            <div>{'Total_PnL'}</div>
            <div className={`earnings-number ${pnl < 0 ? 'negative' : ''}`}>
              {StringHelper.formatCompactNumber(pnl)}
            </div>
          </div>
        </div>
      </div>

      <div className={`role ${member.role}`}>
        {member.role === 'captain' ? 'Leader' : 'Member'}
      </div>

      <div className="action-button-list">
        {showExpandButton && (
          <ButtonDiv
            className="expand-button"
            onClick={() => setIsExpand((v) => !v)}
          >
            {isExpand ? 'Minimize' : 'Expand'}
          </ButtonDiv>
        )}
        {canKick && (
          <ButtonDiv
            className="kick-button"
            onClick={() => onKickMember(member)}
          >
            {'Kick'}
          </ButtonDiv>
        )}
      </div>

      {isExpand && (
        <div className="positions-expand" style={{ borderColor }}>
          {isLoadingPositions && positions.length === 0 ? (
            <div className="positions-expand-loading">
              {'Loading_positions…'}
            </div>
          ) : positions.length === 0 ? (
            <div className="positions-expand-empty">{'No_open_positions'}</div>
          ) : (
            <table className="member-positions-table">
              <thead>
                <tr>
                  <th>{'Token'}</th>
                  <th>{'Side'}</th>
                  <th>{'Size'}</th>
                  <th>{'Entry'}</th>
                  <th>{'Mark'}</th>
                  <th>{'uPnL'}</th>
                  <th>{'Margin'}</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const mark = markBySymbol[p.symbol];
                  const valueUsd =
                    mark !== undefined && Number.isFinite(mark)
                      ? PositionHelper.positionNotionalUsd(p.amount, mark)
                      : null;
                  const lev = PositionHelper.leverageForPosition({
                    position: p,
                    markPrice: mark,
                    leverageBySymbol,
                  });
                  const maxLev = maxLeverageBySymbol[p.symbol];
                  const levForMargin =
                    lev !== null && lev > 0 ? lev : maxLev ?? null;
                  const marginUsd =
                    valueUsd !== null &&
                    levForMargin !== null &&
                    levForMargin > 0
                      ? valueUsd / levForMargin
                      : null;
                  const upnl =
                    mark !== undefined && Number.isFinite(mark)
                      ? PositionHelper.unrealizedPnlUsd(
                          p.side,
                          p.amount,
                          p.entryPrice,
                          mark,
                        )
                      : null;
                  const sideTag = PositionHelper.sideTag(p.side);
                  return (
                    <tr key={`${p.symbol}-${p.side}-${p.updatedAtMs}`}>
                      <td>{p.symbol}</td>
                      <td className={`side ${sideTag}`}>{sideTag}</td>
                      <td>
                        {p.amount.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}
                      </td>
                      <td>
                        {Number.isFinite(p.entryPrice)
                          ? PositionHelper.formatPriceWithTickSize(
                              p.entryPrice,
                              tickBySymbol[p.symbol],
                            )
                          : '—'}
                      </td>
                      <td>
                        {mark !== undefined && Number.isFinite(mark)
                          ? PositionHelper.formatPriceWithTickSize(
                              mark,
                              tickBySymbol[p.symbol],
                            )
                          : '—'}
                      </td>
                      <td
                        className={
                          upnl !== null && upnl < 0 ? 'negative' : 'positive'
                        }
                      >
                        {upnl !== null
                          ? `$${upnl.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}`
                          : '—'}
                      </td>
                      <td>
                        {marginUsd !== null
                          ? `$${marginUsd.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} (${p.isolated ? 'Isolated' : 'Cross'})`
                          : Number.isFinite(p.margin) && p.margin > 0
                          ? `${p.margin.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })} (${p.isolated ? 'Isolated' : 'Cross'})`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default SquadMemberCard;
