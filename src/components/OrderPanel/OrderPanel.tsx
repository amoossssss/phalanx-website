import { useCallback, useEffect, useMemo, useState } from 'react';

import UpdateLeverageDialog from '@/components/UpdateLeverageDialog/UpdateLeverageDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Constants from '@/utils/constants/Constants';
import EnvVariables from '@/utils/constants/EnvVariables';
import PacificaHelper, {
  type PacificaAccountInfo,
  type PacificaPosition,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import useWindowSize from '@/utils/hooks/useWindowSize';
import useWalletAuth from '@/utils/hooks/useWalletAuth';
import { useAuth } from '@/utils/contexts/AuthContext';

import './OrderPanel.scss';

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';
type MarginMode = 'cross' | 'isolated';

type OrderPanelProps = {
  /** Current market symbol, e.g. 'BTC'. */
  market: string;
  /** Lot size in base token units (minimum tradable size). */
  lotSize?: number;
  /** Available balance in USD (or quote currency) used for quick % buttons. */
  availableBalance?: number;
  /** Max leverage for the slider. */
  maxLeverage?: number;
  /** Optional pre-fetched account info to show in the footer. */
  accountInfo?: PacificaAccountInfo | null;
  /** Optional callback for wiring to real order creation later. */
  onSubmit?: (order: {
    type: OrderType;
    side: OrderSide;
    leverage: number;
    price?: number;
    amount: number;
    reduceOnly: boolean;
  }) => void;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const OrderPanel = ({
  market,
  lotSize = 1,
  availableBalance = 0,
  maxLeverage = 50,
  accountInfo,
  onSubmit,
}: OrderPanelProps) => {
  const { userAddress, isLogin } = useAuth();
  const {
    signMessage,
    isActiveWalletSameAsSession,
    walletReadyForSigningMessage,
  } = useWalletAuth();
  const { snackbar } = useNotification();
  const { isWindowSmall } = useWindowSize();

  const [orderType, setOrderType] = useState<OrderType>('market');
  const [side, setSide] = useState<OrderSide>('buy');
  const [marginMode, setMarginMode] = useState<MarginMode>('cross');
  const [leverage, setLeverage] = useState(1);
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [isMarginModeUpdating, setIsMarginModeUpdating] = useState(false);
  const [isLeverageDialogOpen, setIsLeverageDialogOpen] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [positions, setPositions] = useState<PacificaPosition[]>([]);

  // const amountNum = useMemo(() => parseNumber(amount), [amount]);
  const tokenAmountNum = useMemo(
    () => StringHelper.parseNumber(tokenAmount),
    [tokenAmount],
  );
  const priceNum = useMemo(() => StringHelper.parseNumber(price), [price]);

  const effectivePrice = useMemo(() => {
    if (orderType === 'limit') {
      return priceNum && priceNum > 0 ? priceNum : null;
    }
    return marketPrice && marketPrice > 0 ? marketPrice : null;
  }, [orderType, priceNum, marketPrice]);

  const notionalUsd = useMemo(() => {
    if (!tokenAmountNum || tokenAmountNum <= 0) return 0;
    if (!effectivePrice || effectivePrice <= 0) return 0;
    return tokenAmountNum * effectivePrice;
  }, [effectivePrice, tokenAmountNum]);

  const positionForMarket = useMemo(() => {
    if (!market) return null;
    return positions.find((p) => p.symbol === market) ?? null;
  }, [market, positions]);

  /**
   * When reduce-only: max USD size is position notional at the working price (mark / limit).
   * Sell reduces a long; buy reduces a short.
   */
  const maxReduceUsd = useMemo((): number | null => {
    if (!reduceOnly) return null;
    const pos = positionForMarket;
    const mark = effectivePrice ?? marketPrice;
    if (!pos || !mark || mark <= 0) return 0;
    const closingLong = side === 'sell';
    const closingShort = side === 'buy';
    if (closingLong && pos.side !== 'bid') return 0;
    if (closingShort && pos.side !== 'ask') return 0;
    if (!Number.isFinite(pos.amount) || pos.amount <= 0) return 0;
    return PositionHelper.positionNotionalUsd(pos.amount, mark) ?? 0;
  }, [reduceOnly, positionForMarket, side, effectivePrice, marketPrice]);

  const applyUsdAmountToInputs = useCallback(
    (usdRaw: number) => {
      if (!effectivePrice || effectivePrice <= 0) {
        setTokenAmount('');
        return;
      }
      let usd = usdRaw;
      if (maxReduceUsd !== null) {
        if (maxReduceUsd <= 0) {
          setAmount('');
          setTokenAmount('');
          return;
        }
        usd = Math.min(usd, maxReduceUsd);
      }
      if (usd <= 0) {
        setAmount('');
        setTokenAmount('');
        return;
      }
      setAmount(
        usd.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        }),
      );
      let tokens = usd / effectivePrice;
      if (lotSize && lotSize > 0) {
        const lots = Math.floor(tokens / lotSize);
        if (lots <= 0) {
          setTokenAmount('');
          return;
        }
        tokens = lots * lotSize;
      }
      setTokenAmount(
        tokens.toLocaleString(undefined, {
          maximumFractionDigits: 6,
        }),
      );
    },
    [effectivePrice, lotSize, maxReduceUsd],
  );

  const feeRate = useMemo(() => {
    if (!accountInfo) return 0;
    if (orderType === 'market') return accountInfo.takerFee ?? 0;
    // Prefer maker fee for limit orders; fall back to taker if missing.
    return accountInfo.makerFee ?? accountInfo.takerFee ?? 0;
  }, [accountInfo, orderType]);

  const feeEstimate = useMemo(() => {
    if (!notionalUsd || notionalUsd <= 0) return 0;
    if (!feeRate || feeRate <= 0) return 0;
    return notionalUsd * feeRate;
  }, [feeRate, notionalUsd]);

  const orderMarginUsd = useMemo(() => {
    if (!notionalUsd || notionalUsd <= 0) return 0;
    if (!Number.isFinite(leverage) || leverage <= 0) return 0;
    return notionalUsd / leverage;
  }, [leverage, notionalUsd]);

  const isTokenAmountValid = useMemo(() => {
    if (!tokenAmountNum || tokenAmountNum <= 0) return false;
    if (!lotSize || lotSize <= 0) return tokenAmountNum > 0;
    const rawLots = tokenAmountNum / lotSize;
    const lots = Math.round(rawLots);
    if (lots <= 0) return false;
    const snapped = lots * lotSize;
    const diff = Math.abs(snapped - tokenAmountNum);
    return diff <= Math.abs(lotSize) * 1e-8;
  }, [lotSize, tokenAmountNum]);

  const canSubmit = useMemo(() => {
    if (!isLogin || !userAddress) return false;
    if (!walletReadyForSigningMessage) return false;
    if (!isActiveWalletSameAsSession) return false;
    if (!isTokenAmountValid) return false;
    if (orderType === 'limit') {
      if (!priceNum || priceNum <= 0) return false;
    }
    if (maxReduceUsd !== null) {
      if (maxReduceUsd <= 0) return false;
      if (notionalUsd > maxReduceUsd + 1e-6) return false;
    }
    // Reserve estimated fee from effective buying power (available balance * leverage).
    if (notionalUsd > 0 && feeEstimate > 0) {
      const effectiveBuyingPower = availableBalance * leverage;
      if (notionalUsd + feeEstimate > effectiveBuyingPower) return false;
    }
    return true;
  }, [
    availableBalance,
    feeEstimate,
    isActiveWalletSameAsSession,
    isLogin,
    isTokenAmountValid,
    leverage,
    maxReduceUsd,
    notionalUsd,
    orderType,
    priceNum,
    userAddress,
    walletReadyForSigningMessage,
  ]);

  useEffect(() => {
    setAmount('');
    setTokenAmount('');
    setPrice('');
  }, [orderType]);

  useEffect(() => {
    if (leverage > maxLeverage) {
      setLeverage(maxLeverage);
    }
  }, [leverage, maxLeverage]);

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account || !market) {
      setLeverage(1);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const settings = await PacificaHelper.getAccountSettings({ account });
        if (cancelled) return;
        const row = settings.marginSettings.find((s) => s.symbol === market);
        setMarginMode(row?.isolated ? 'isolated' : 'cross');
        // Docs: default leverage returns blank for that market; default is max.
        const next =
          row && Number.isFinite(row.leverage) && row.leverage > 0
            ? row.leverage
            : maxLeverage;
        setLeverage(clamp(Math.floor(next), 1, maxLeverage));
      } catch (e) {
        // Non-fatal: keep current leverage
        console.warn('get account settings failed', e);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountLeverage({
      account,
      onLeverage: (u) => {
        if (cancelled) return;
        if (u.symbol !== market) return;
        if (!Number.isFinite(u.leverage) || u.leverage <= 0) return;
        setLeverage(clamp(Math.floor(u.leverage), 1, maxLeverage));
      },
      onError: (e) => {
        console.warn('account leverage websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, market, maxLeverage, userAddress]);

  useEffect(() => {
    const account = userAddress;
    if (!isLogin || !account) {
      setPositions([]);
      return;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const initial = await PacificaHelper.getPositions({ account });
        if (!cancelled) setPositions(initial);
      } catch (e) {
        console.warn('order panel positions fetch failed', e);
      }
    })();

    unsubscribe = PacificaHelper.subscribeAccountPositions({
      account,
      onPositions: (next) => {
        if (cancelled) return;
        setPositions(next);
      },
      onError: (e) => {
        console.warn('order panel account positions websocket error', e);
      },
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [isLogin, userAddress]);

  useEffect(() => {
    if (!market) return;
    const unsubscribe = PacificaHelper.subscribeLastPrice({
      market,
      onPrice: (p) => {
        if (Number.isFinite(p)) {
          setMarketPrice(p);
        }
      },
      onError: (err) => {
        // Non-fatal: price stays on last known value
        console.warn('last price websocket error', err);
      },
    });
    return () => {
      unsubscribe();
    };
  }, [market]);

  useEffect(() => {
    if (orderType !== 'limit') return;
    if (!tokenAmountNum || tokenAmountNum <= 0) return;
    if (!priceNum || priceNum <= 0) return;
    const usd = tokenAmountNum * priceNum;
    setAmount(
      usd.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      }),
    );
    // Intentionally only depend on price/orderType:
    // when user edits USD, we don't want to immediately overwrite it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderType, priceNum]);

  useEffect(() => {
    if (!reduceOnly || maxReduceUsd === null) return;
    if (maxReduceUsd <= 0) {
      setAmount('');
      setTokenAmount('');
      return;
    }
    if (!effectivePrice || effectivePrice <= 0) return;
    const usd = StringHelper.parseNumber(amount);
    if (!usd || usd <= maxReduceUsd + 1e-9) return;
    applyUsdAmountToInputs(usd);
  }, [
    amount,
    applyUsdAmountToInputs,
    effectivePrice,
    maxReduceUsd,
    reduceOnly,
  ]);

  const applyMarginMode = useCallback(
    async (nextMode: MarginMode) => {
      if (!isLogin || !userAddress || !market) return;
      if (!walletReadyForSigningMessage) return;
      if (!isActiveWalletSameAsSession) return;
      const signer = signMessage;
      if (!signer) return;

      setIsMarginModeUpdating(true);
      try {
        await PacificaHelper.updateMarginMode({
          account: userAddress,
          symbol: market,
          isIsolated: nextMode === 'isolated',
          signMessage: signer,
        });
        setMarginMode(nextMode);
        snackbar.success('Margin mode updated successfully');
      } catch (e) {
        snackbar.error(e?.toString?.() ?? String(e));
      } finally {
        setIsMarginModeUpdating(false);
      }
    },
    [
      isActiveWalletSameAsSession,
      isLogin,
      market,
      signMessage,
      userAddress,
      walletReadyForSigningMessage,
    ],
  );

  const handlePlaceOrder = async () => {
    if (!canSubmit) return;
    const signer = signMessage;
    if (!isLogin || !userAddress || !signer) {
      console.warn(
        'Cannot place market order: missing login, account, or signMessage',
      );
      return;
    }

    setIsOrderLoading(true);
    try {
      if (orderType === 'market') {
        if (tokenAmountNum && tokenAmountNum > 0) {
          await PacificaHelper.marketOrder({
            account: userAddress,
            symbol: market,
            side: side === 'buy' ? 'bid' : 'ask',
            amount: String(tokenAmountNum),
            slippagePercent: '0.5',
            reduceOnly,
            builderCode: EnvVariables.PACIFICA_BUILDER_CODE,
            signMessage: signer,
          });
          snackbar.success('Order placed successfully');
          setAmount('');
          setTokenAmount('');
        }
      } else if (orderType === 'limit') {
        if (tokenAmountNum && tokenAmountNum > 0 && priceNum && priceNum > 0) {
          await PacificaHelper.limitOrder({
            account: userAddress,
            symbol: market,
            side: side === 'buy' ? 'bid' : 'ask',
            price: priceNum,
            amount: String(tokenAmountNum),
            tif: 'GTC',
            reduceOnly,
            builderCode: EnvVariables.PACIFICA_BUILDER_CODE,
            signMessage: signer,
          });
          snackbar.success('Order placed successfully');
          setAmount('');
          setPrice('');
          setTokenAmount('');
        }
      }
    } catch (e) {
      console.error('place order failed', e);
      snackbar.error(e?.toString?.() ?? String(e));
    } finally {
      setIsOrderLoading(false);
    }

    onSubmit?.({
      type: orderType,
      side,
      leverage,
      price: orderType === 'limit' ? priceNum ?? undefined : undefined,
      amount: tokenAmountNum ?? 0,
      reduceOnly,
    });
  };

  return (
    <div className="order-panel">
      <div className="order-panel-header">
        <ButtonDiv
          className="leverage-button"
          onClick={() => setIsLeverageDialogOpen(true)}
        >
          {`${leverage}x`}
        </ButtonDiv>
        <div className="type-toggle">
          <ButtonDiv
            className={orderType === 'market' ? 'toggle active' : 'toggle'}
            onClick={() => setOrderType('market')}
          >
            {'Market'}
          </ButtonDiv>
          <ButtonDiv
            className={orderType === 'limit' ? 'toggle active' : 'toggle'}
            onClick={() => setOrderType('limit')}
          >
            {'Limit'}
          </ButtonDiv>
        </div>
      </div>

      {isLeverageDialogOpen && (
        <UpdateLeverageDialog
          symbol={market}
          currentLeverage={leverage}
          maxLeverage={maxLeverage}
          close={() => setIsLeverageDialogOpen(false)}
          onUpdated={(next) => setLeverage(clamp(next, 1, maxLeverage))}
        />
      )}

      <div className="margin-toggle">
        <ButtonDiv
          className={
            marginMode === 'cross' ? 'margin-btn active' : 'margin-btn'
          }
          disabled={isOrderLoading || isMarginModeUpdating}
          onClick={() => void applyMarginMode('cross')}
        >
          {'Cross'}
        </ButtonDiv>
        <ButtonDiv
          className={
            marginMode === 'isolated' ? 'margin-btn active' : 'margin-btn'
          }
          disabled={isOrderLoading || isMarginModeUpdating}
          onClick={() => void applyMarginMode('isolated')}
        >
          {'Isolated'}
        </ButtonDiv>
      </div>

      <div className="side-toggle">
        <ButtonDiv
          className={side === 'buy' ? 'side-btn buy active' : 'side-btn buy'}
          onClick={() => setSide('buy')}
        >
          {'Buy'}
        </ButtonDiv>
        <ButtonDiv
          className={side === 'sell' ? 'side-btn sell active' : 'side-btn sell'}
          onClick={() => setSide('sell')}
        >
          {'Sell'}
        </ButtonDiv>
      </div>

      {orderType === 'limit' && (
        <div className="section">
          <div className="label">{'Price'}</div>
          <input
            className="input"
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(e) =>
              setPrice(StringHelper.sanitizeDecimalInput(e.target.value))
            }
          />
        </div>
      )}

      <div className="section">
        <div className="row">
          <div className="label">{'Usd_Amount'}</div>
        </div>
        <input
          className="input"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => {
            const next = StringHelper.sanitizeDecimalInput(e.target.value);
            setAmount(next);
            if (!effectivePrice || effectivePrice <= 0) {
              return;
            }
            const usd = StringHelper.parseNumber(next);
            if (usd && usd > 0) {
              applyUsdAmountToInputs(usd);
            } else {
              setTokenAmount('');
            }
          }}
        />

        <div className="quick">
          {Constants.QUICK_PCTS.map((pct) => (
            <ButtonDiv
              key={pct}
              className="quick-btn"
              onClick={() => {
                const v = reduceOnly
                  ? maxReduceUsd !== null && maxReduceUsd > 0
                    ? (maxReduceUsd * pct) / 100
                    : 0
                  : (availableBalance * pct * leverage) / 100;
                applyUsdAmountToInputs(v);
              }}
            >
              {`${pct}%`}
            </ButtonDiv>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="row">
          <div className="label">{'Token_Amount'}</div>
        </div>
        <input
          className="input readonly"
          inputMode="decimal"
          placeholder="-"
          value={tokenAmount}
          disabled={true}
          readOnly={true}
        />
      </div>

      <label className="reduce-only-row">
        <span className="reduce-only-label">{'Reduce_only'}</span>
        <span className="reduce-only-control">
          <input
            type="checkbox"
            className="reduce-only-input"
            checked={reduceOnly}
            onChange={(e) => setReduceOnly(e.target.checked)}
          />
          <span className="reduce-only-box" aria-hidden="true" />
        </span>
      </label>

      <div className="row">
        <div className="label">{'Order_margin'}</div>
        <div className="value">
          {orderMarginUsd > 0
            ? orderMarginUsd.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })
            : '—'}
        </div>
      </div>

      <div className="row">
        <div className="label">{'Est_fee'}</div>
        <div className="value">
          {feeEstimate > 0
            ? feeEstimate.toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })
            : '—'}
        </div>
      </div>

      <ButtonDiv
        className={`submit ${canSubmit ? '' : 'disabled'} ${
          side === 'buy' ? 'buy' : 'sell'
        }`}
        disabled={!canSubmit || isOrderLoading}
        onClick={() => void handlePlaceOrder()}
      >
        {isOrderLoading ? '<Req_Signature>' : '<Place_Order>'}
      </ButtonDiv>

      <div className="section account-summary">
        <div className="row">
          <div className="label" title="Account balance + unrealized PnL">
            {'Account_equity'}
          </div>
          <div className="value">
            {accountInfo
              ? accountInfo.accountEquity.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : '—'}
          </div>
        </div>
        <div className="row">
          <div
            className="label"
            title="Amount of account equity that is available to use as margin for trades"
          >
            {'Avail_to_spend'}
          </div>
          <div className="value">
            {accountInfo
              ? accountInfo.availableToSpend.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })
              : '—'}
          </div>
        </div>
        {isWindowSmall ? (
          <>
            <div className="row">
              <div className="label">{'Taker_fee'}</div>
              <div className="value">
                {accountInfo
                  ? `${parseFloat(
                      (accountInfo.takerFee * 100).toFixed(4),
                    ).toString()}%`
                  : '—'}
              </div>
            </div>
            <div className="row">
              <div className="label">{'Maker_fee'}</div>
              <div className="value">
                {accountInfo
                  ? `${parseFloat(
                      (accountInfo.makerFee * 100).toFixed(4),
                    ).toString()}%`
                  : '—'}
              </div>
            </div>
          </>
        ) : (
          <div className="row">
            <div className="label">{'Taker_Maker_fee'}</div>
            <div className="value">
              {accountInfo
                ? `${parseFloat(
                    (accountInfo.takerFee * 100).toFixed(4),
                  ).toString()}%`
                : '—'}
              {' / '}
              {accountInfo
                ? `${parseFloat(
                    (accountInfo.makerFee * 100).toFixed(4),
                  ).toString()}%`
                : '—'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderPanel;
