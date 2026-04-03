import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import UpdateLeverageDialog from '@/components/UpdateLeverageDialog/UpdateLeverageDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Constants from '@/utils/constants/Constants';
import EnvVariables from '@/utils/constants/EnvVariables';
import PacificaHelper, {
  type PacificaAccountInfo,
} from '@/utils/helpers/PacificaHelper';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './OrderPanel.scss';

type OrderType = 'market' | 'limit';
type OrderSide = 'buy' | 'sell';

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
  const { signMessage } = useWallet();
  const { snackbar } = useNotification();

  const [orderType, setOrderType] = useState<OrderType>('market');
  const [side, setSide] = useState<OrderSide>('buy');
  const [leverage, setLeverage] = useState(1);
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [isLeverageDialogOpen, setIsLeverageDialogOpen] = useState(false);

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
    if (!isTokenAmountValid) return false;
    if (orderType === 'limit') {
      if (!priceNum || priceNum <= 0) return false;
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
    isTokenAmountValid,
    leverage,
    notionalUsd,
    orderType,
    priceNum,
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

  const handlePlaceOrder = () => {
    if (!canSubmit) return;
    if (!isLogin || !userAddress || !signMessage) {
      console.warn(
        'Cannot place market order: missing login, account, or signMessage',
      );
      return;
    }

    setIsOrderLoading(true);

    if (orderType === 'market') {
      if (tokenAmountNum && tokenAmountNum > 0) {
        void PacificaHelper.marketOrder({
          account: userAddress,
          symbol: market,
          side: side === 'buy' ? 'bid' : 'ask',
          amount: String(tokenAmountNum),
          slippagePercent: '0.5',
          reduceOnly: false,
          builderCode: EnvVariables.PACIFICA_BUILDER_CODE,
          signMessage,
        })
          .then(() => {
            snackbar.success('Order placed successfully');
            setAmount('');
            setTokenAmount('');
          })
          .catch((e) => {
            console.error('market order failed', e);
            snackbar.error(e.toString());
          })
          .finally(() => {
            setIsOrderLoading(false);
          });
      }
    } else if (orderType === 'limit') {
      if (tokenAmountNum && tokenAmountNum > 0 && priceNum && priceNum > 0) {
        void PacificaHelper.limitOrder({
          account: userAddress,
          symbol: market,
          side: side === 'buy' ? 'bid' : 'ask',
          price: priceNum,
          amount: String(tokenAmountNum),
          tif: 'GTC',
          reduceOnly: false,
          builderCode: EnvVariables.PACIFICA_BUILDER_CODE,
          signMessage,
        })
          .then(() => {
            snackbar.success('Order placed successfully');
            setAmount('');
            setPrice('');
            setTokenAmount('');
          })
          .catch((e) => {
            console.error('limit order failed', e);
            snackbar.error(e.toString());
          })
          .finally(() => {
            setIsOrderLoading(false);
          });
      }
    }

    onSubmit?.({
      type: orderType,
      side,
      leverage,
      price: orderType === 'limit' ? priceNum ?? undefined : undefined,
      amount: tokenAmountNum ?? 0,
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
          close={() => setIsLeverageDialogOpen(false)}
          onUpdated={(next) => setLeverage(clamp(next, 1, maxLeverage))}
        />
      )}

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
                const v = (availableBalance * pct * leverage) / 100;
                setAmount(
                  v.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  }),
                );
                if (!effectivePrice || effectivePrice <= 0) return;
                let tokens = v / effectivePrice;
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
        onClick={handlePlaceOrder}
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
      </div>
    </div>
  );
};

export default OrderPanel;
