import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';
import PacificaHelper from '@/utils/helpers/PacificaHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './WithdrawDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type WithdrawDialogProps = {
  close: () => void;
};

const WithdrawDialog = ({ close }: WithdrawDialogProps) => {
  const { publicKey, signMessage, connected } = useWallet();
  const { userAddress, isLogin } = useAuth();
  const { snackbar } = useNotification();

  const [amountStr, setAmountStr] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [availableToWithdraw, setAvailableToWithdraw] = useState<number | null>(
    null,
  );
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    if (!userAddress) {
      setAvailableToWithdraw(null);
      return;
    }

    let cancelled = false;
    setAccountLoading(true);

    void (async () => {
      try {
        const info = await PacificaHelper.getAccountInfo({
          account: userAddress,
        });
        if (!cancelled) {
          setAvailableToWithdraw(info.availableToWithdraw);
        }
      } catch {
        if (!cancelled) {
          setAvailableToWithdraw(null);
        }
      } finally {
        if (!cancelled) {
          setAccountLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userAddress]);

  const availableDisplay = useMemo(() => {
    if (!userAddress) return '—';
    if (accountLoading) return '…';
    if (availableToWithdraw === null) return '—';
    return availableToWithdraw.toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  }, [userAddress, accountLoading, availableToWithdraw]);

  const amountNum = useMemo(() => {
    const n = parseFloat(amountStr.replace(/,/g, ''));
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const addressMatch = useMemo(
    () =>
      Boolean(publicKey && userAddress && publicKey.toBase58() === userAddress),
    [publicKey, userAddress],
  );

  const canSubmit = useMemo(() => {
    if (!isLogin || !addressMatch) return false;
    if (!connected || !publicKey || !signMessage) return false;
    if (!Number.isFinite(amountNum) || amountNum <= 0) return false;
    if (
      availableToWithdraw !== null &&
      amountNum > availableToWithdraw + 1e-9
    ) {
      return false;
    }
    return true;
  }, [
    addressMatch,
    amountNum,
    availableToWithdraw,
    connected,
    isLogin,
    publicKey,
    signMessage,
  ]);

  const handleWithdraw = () => {
    if (!canSubmit || !publicKey || !signMessage || !userAddress) return;

    setIsLoading(true);
    void (async () => {
      try {
        const amountApi = String(amountNum);
        await PacificaHelper.withdraw({
          account: userAddress,
          amount: amountApi,
          signMessage,
        });
        snackbar.success('Withdrawal requested!');
        close();
      } catch (err) {
        console.error('withdraw failed', err);
        snackbar.error(
          err instanceof Error ? err.message : String(err ?? 'Withdraw failed'),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <dialog
      className="withdraw-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Withdraw>'}</div>

        <div className="section">
          <div className="row">
            <div className="label">{'Available_To_Withdraw_USDC'}</div>
            <div className="value">{availableDisplay}</div>
          </div>
        </div>

        <div className="section">
          <div className="row">
            <div className="label">{'Withdraw_Amount_USDC'}</div>
            <div className="value">
              {Number.isFinite(amountNum) ? `${amountNum}` : '—'}
            </div>
          </div>
          <input
            className="amount-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={isLoading}
          />
          <div className="hint">
            {'Withdraws from your Pacifica account to your wallet.'}
          </div>
          {!addressMatch && isLogin && (
            <div className="hint hint--warn">
              {'Connected wallet must match your logged-in address.'}
            </div>
          )}
        </div>

        <ButtonDiv
          className="withdraw-button"
          onClick={handleWithdraw}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Withdrawing…>' : '<Withdraw>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default WithdrawDialog;
