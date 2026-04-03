import { useMemo, useState } from 'react';

import { useWallet } from '@solana/wallet-adapter-react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';
import PacificaHelper from '@/utils/helpers/PacificaHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './UpdateLeverageDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type UpdateLeverageDialogProps = {
  symbol: string;
  close: () => void;
  currentLeverage?: number | null;
  maxLeverage?: number;
  onUpdated?: (nextLeverage: number) => void;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const UpdateLeverageDialog = ({
  symbol,
  close,
  currentLeverage,
  maxLeverage = 50,
  onUpdated,
}: UpdateLeverageDialogProps) => {
  const { userAddress, isLogin } = useAuth();
  const { signMessage } = useWallet();
  const { snackbar } = useNotification();

  const [leverageValue, setLeverageValue] = useState<number>(
    Number.isFinite(currentLeverage ?? NaN) && (currentLeverage ?? 0) > 0
      ? clamp(Math.floor(currentLeverage as number), 1, maxLeverage)
      : 1,
  );
  const [isLoading, setIsLoading] = useState(false);

  const leverageNum = useMemo(
    () => clamp(Math.floor(leverageValue), 1, maxLeverage),
    [leverageValue, maxLeverage],
  );

  const canSubmit = useMemo(() => {
    if (!symbol) return false;
    if (!isLogin || !userAddress || !signMessage) return false;
    if (!Number.isFinite(leverageNum) || leverageNum <= 0) return false;
    return true;
  }, [isLogin, leverageNum, signMessage, symbol, userAddress]);

  const handleUpdate = () => {
    if (!canSubmit) return;
    if (!userAddress || !signMessage) return;

    setIsLoading(true);
    void PacificaHelper.updateLeverage({
      account: userAddress,
      symbol,
      leverage: leverageNum,
      signMessage,
    })
      .then(() => {
        snackbar.success('Leverage updated!');
        onUpdated?.(leverageNum);
        close();
      })
      .catch((err) => {
        console.error('update leverage failed', err);
        snackbar.error(err?.toString?.() ?? 'Update leverage failed');
      })
      .finally(() => {
        setIsLoading(false);
        close();
      });
  };

  return (
    <dialog className="update-leverage-dialog" open>
      <div className="dialog-content">
        <div className="dialog-title">{`<${symbol}_Leverage>`}</div>

        <div className="section">
          <div className="row">
            <div className="label">{'Leverage'}</div>
            <div className="value">{`${leverageNum}x`}</div>
          </div>
          <input
            className="slider"
            type="range"
            min={1}
            max={maxLeverage}
            step={1}
            value={leverageNum}
            onChange={(e) =>
              setLeverageValue(
                clamp(Number(e.target.value), 1, Math.max(1, maxLeverage)),
              )
            }
            disabled={isLoading}
          />
          <div className="slider-marks">
            <span>{'1x'}</span>
            <span>{`${maxLeverage}x`}</span>
          </div>
        </div>

        <ButtonDiv
          className="update-button"
          onClick={handleUpdate}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Updating…>' : '<Update>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default UpdateLeverageDialog;
