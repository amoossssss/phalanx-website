import { useCallback, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Constants from '@/utils/constants/Constants';
import EnvVariables from '@/utils/constants/EnvVariables';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import PacificaHelper, {
  type PacificaPosition,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './ExitPositionDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type ExitMode = 'market' | 'limit';

type ExitPositionDialogProps = {
  position: PacificaPosition;
  markPrice: number | null;
  close: () => void;
  lotSize?: number;
  /** Market price tick (preferred). When missing, `lotSize` is used as the price step (e.g. BTC lot 1 → whole-tick prices). */
  tickSize?: number;
  onClosed?: () => void;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const ExitPositionDialog = ({
  position,
  markPrice,
  close,
  lotSize = 1,
  tickSize,
  onClosed,
}: ExitPositionDialogProps) => {
  const { userAddress, isLogin } = useAuth();
  const { signMessage } = useWallet();
  const { snackbar } = useNotification();

  const [mode, setMode] = useState<ExitMode>('market');
  /** Fraction of position to close (0–1], drives slider and quick %. */
  const [closeFraction, setCloseFraction] = useState(1);
  const [limitPriceInput, setLimitPriceInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const absSize = Math.abs(position.amount);
  const sideLabel = PositionHelper.sideTag(position.side);

  const limitPriceIncrement = useMemo(() => {
    if (tickSize !== undefined && Number.isFinite(tickSize) && tickSize > 0) {
      return tickSize;
    }
    if (lotSize > 0 && Number.isFinite(lotSize)) {
      return lotSize;
    }
    return 1;
  }, [lotSize, tickSize]);

  const closeAmountNum = useMemo(() => {
    return PositionHelper.closeAmountFromFraction({
      positionAmount: position.amount,
      closeFraction,
      lotSize,
    });
  }, [closeFraction, lotSize, position.amount]);

  const closePositionRatio = absSize > 0 ? closeAmountNum / absSize : 0;

  const ratioPercentSlider = Math.round(closeFraction * 100);

  const totalPnL = useMemo(() => {
    if (markPrice === null || !Number.isFinite(markPrice)) return null;
    return PositionHelper.unrealizedPnlUsd(
      position.side,
      position.amount,
      position.entryPrice,
      markPrice,
    );
  }, [markPrice, position]);

  const limitPriceNum = useMemo(
    () => StringHelper.parseNumber(limitPriceInput),
    [limitPriceInput],
  );

  const limitPriceSnapped = useMemo(() => {
    if (limitPriceNum === null || !Number.isFinite(limitPriceNum)) return null;
    const s = PositionHelper.snapLimitPriceToIncrement(
      limitPriceNum,
      limitPriceIncrement,
    );
    return s > 0 ? s : null;
  }, [limitPriceIncrement, limitPriceNum]);

  const formatLimitPriceDisplay = useCallback(
    (value: number) => {
      const inc = limitPriceIncrement;
      if (!Number.isFinite(inc) || inc <= 0) {
        return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
      }
      const dec = PositionHelper.priceIncrementDisplayDecimals(inc);
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: dec,
      });
    },
    [limitPriceIncrement],
  );

  const signedPositionAmount = useMemo(
    () => PositionHelper.signedAbsSize(position),
    [position],
  );

  const estimatedPnlUsd = useMemo(() => {
    if (mode === 'market') {
      if (totalPnL === null) return null;
      return totalPnL * closePositionRatio;
    }
    if (markPrice === null || !Number.isFinite(markPrice)) return null;
    if (limitPriceSnapped === null) return null;
    return (
      (limitPriceSnapped - markPrice) *
      signedPositionAmount *
      closePositionRatio
    );
  }, [
    closePositionRatio,
    limitPriceSnapped,
    markPrice,
    mode,
    signedPositionAmount,
    totalPnL,
  ]);

  const builderCode =
    position.builder_code ?? EnvVariables.PACIFICA_BUILDER_CODE;

  const initLimitPrice = useCallback(() => {
    if (mode !== 'limit') {
      if (markPrice !== null && Number.isFinite(markPrice)) {
        const snapped = PositionHelper.snapLimitPriceToIncrement(
          markPrice,
          limitPriceIncrement,
        );
        setLimitPriceInput(
          snapped > 0 ? formatLimitPriceDisplay(snapped) : String(markPrice),
        );
      }
    }
  }, [markPrice, limitPriceIncrement, formatLimitPriceDisplay, mode]);

  const canSubmit = useMemo(() => {
    if (!position.symbol) return false;
    if (!isLogin || !userAddress || !signMessage) return false;
    if (!builderCode) return false;
    if (!closeAmountNum || closeAmountNum <= 0) return false;
    if (mode === 'limit') {
      if (limitPriceSnapped === null || limitPriceSnapped <= 0) return false;
    }
    return true;
  }, [
    builderCode,
    closeAmountNum,
    isLogin,
    limitPriceSnapped,
    mode,
    position.symbol,
    signMessage,
    userAddress,
  ]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (!userAddress || !signMessage) return;

    setIsLoading(true);
    void PacificaHelper.closePosition({
      account: userAddress,
      symbol: position.symbol,
      positionSide: position.side,
      amount: PositionHelper.formatCloseAmountForApi(closeAmountNum, lotSize),
      lotSize,
      mode,
      limitPrice: mode === 'limit' ? limitPriceSnapped ?? undefined : undefined,
      slippagePercent: '0.5',
      builderCode,
      signMessage,
    })
      .then(() => {
        snackbar.success(
          mode === 'market' ? 'Market close submitted' : 'Limit close placed',
        );
        onClosed?.();
        close();
      })
      .catch((err) => {
        console.error('close position failed', err);
        snackbar.error(err?.toString?.() ?? 'Close position failed');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const pnlClass =
    estimatedPnlUsd === null
      ? ''
      : estimatedPnlUsd >= 0
      ? 'pnl-positive'
      : 'pnl-negative';

  const pnlLabel =
    estimatedPnlUsd === null
      ? '—'
      : `${estimatedPnlUsd >= 0 ? '+' : '-'}$${Math.abs(
          estimatedPnlUsd,
        ).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

  return (
    <dialog className="exit-position-dialog" open>
      <div className="dialog-content">
        <div className="dialog-title">{`<${sideLabel}_${position.symbol}_Exit>`}</div>

        <div className="section">
          <div className="row">
            <div className="label">{'Position_size'}</div>
            <div className="value">
              {`${absSize.toLocaleString(undefined, {
                maximumFractionDigits: 8,
              })} ${position.symbol}`}
            </div>
          </div>
        </div>

        <div className="section">
          <div className="row">
            <div className="label">{'Close_Mode'}</div>
            <div className="type-toggle">
              <ButtonDiv
                className={mode === 'market' ? 'toggle active' : 'toggle'}
                onClick={() => setMode('market')}
                disabled={isLoading}
              >
                {'Market'}
              </ButtonDiv>
              <ButtonDiv
                className={mode === 'limit' ? 'toggle active' : 'toggle'}
                onClick={() => {
                  initLimitPrice();
                  setMode('limit');
                }}
                disabled={isLoading}
              >
                {'Limit'}
              </ButtonDiv>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="row">
            <div className="label">{'Close_size'}</div>
            <div className="value">{`${ratioPercentSlider}% (~${closeAmountNum.toLocaleString(
              undefined,
              { maximumFractionDigits: 8 },
            )})`}</div>
          </div>
          <input
            className="slider"
            type="range"
            min={1}
            max={100}
            step={1}
            value={ratioPercentSlider}
            onChange={(e) =>
              setCloseFraction(clamp(Number(e.target.value), 1, 100) / 100)
            }
            disabled={isLoading}
          />
          <div className="slider-marks">
            <span>{'1%'}</span>
            <span>{'100%'}</span>
          </div>
          <div className="quick-pct-row">
            {Constants.QUICK_PCTS.map((pct) => (
              <ButtonDiv
                key={pct}
                className={
                  ratioPercentSlider === pct ? 'quick-pct active' : 'quick-pct'
                }
                onClick={() => {
                  setCloseFraction(pct / 100);
                }}
                disabled={isLoading}
              >
                {`${pct}%`}
              </ButtonDiv>
            ))}
          </div>
        </div>

        {mode === 'limit' ? (
          <div className="section">
            <div className="row">
              <div className="label">{'Limit_price'}</div>
            </div>
            <input
              className="limit-input"
              type="text"
              inputMode="decimal"
              value={limitPriceInput}
              onChange={(e) => setLimitPriceInput(e.target.value)}
              onBlur={() => {
                const parsed = StringHelper.parseNumber(limitPriceInput);
                if (
                  parsed === null ||
                  !Number.isFinite(parsed) ||
                  parsed <= 0
                ) {
                  return;
                }
                const snapped = PositionHelper.snapLimitPriceToIncrement(
                  parsed,
                  limitPriceIncrement,
                );
                if (snapped > 0) {
                  setLimitPriceInput(formatLimitPriceDisplay(snapped));
                }
              }}
              disabled={isLoading}
            />
          </div>
        ) : null}

        <div className="section">
          <div className="row">
            <div className="label">{'Est_PnL_USD'}</div>
            <div className={`value ${pnlClass}`}>{pnlLabel}</div>
          </div>
        </div>

        <ButtonDiv
          className="submit-button"
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Submitting…>' : '<Close_position>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default ExitPositionDialog;
