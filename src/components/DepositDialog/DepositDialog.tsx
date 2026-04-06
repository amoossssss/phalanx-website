import { useEffect, useMemo, useState } from 'react';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import type { Keypair } from '@solana/web3.js';
import {
  USDC_MINT,
  createDepositTransaction,
} from 'pacifica-ts-sdk/dist/utils/deposit';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './DepositDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

/** Matches `pacifica-ts-sdk` on-chain deposit minimum. */
const MIN_DEPOSIT_USDC = 10;

type DepositDialogProps = {
  close: () => void;
};

const DepositDialog = ({ close }: DepositDialogProps) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const { userAddress, isLogin } = useAuth();
  const { snackbar } = useNotification();

  const [amountStr, setAmountStr] = useState('10');
  const [isLoading, setIsLoading] = useState(false);
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null);
  const [walletUsdcLoading, setWalletUsdcLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) {
      setWalletUsdc(null);
      return;
    }

    let cancelled = false;
    setWalletUsdcLoading(true);

    void (async () => {
      try {
        const ata = await getAssociatedTokenAddress(USDC_MINT, publicKey);
        const res = await connection.getTokenAccountBalance(ata);
        const ui = res.value.uiAmount;
        if (!cancelled) {
          setWalletUsdc(ui !== null && ui !== undefined ? ui : 0);
        }
      } catch {
        if (!cancelled) {
          setWalletUsdc(0);
        }
      } finally {
        if (!cancelled) {
          setWalletUsdcLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  const walletUsdcDisplay = useMemo(() => {
    if (!publicKey) return '—';
    if (walletUsdcLoading) return '…';
    if (walletUsdc === null) return '—';
    return walletUsdc.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }, [publicKey, walletUsdc, walletUsdcLoading]);

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
    if (!connected || !publicKey || !signTransaction) return false;
    if (!Number.isFinite(amountNum) || amountNum < MIN_DEPOSIT_USDC) {
      return false;
    }
    return true;
  }, [addressMatch, amountNum, connected, isLogin, publicKey, signTransaction]);

  const handleDeposit = () => {
    if (!canSubmit || !publicKey || !signTransaction) return;

    setIsLoading(true);
    void (async () => {
      try {
        const rpcEndpoint = connection.rpcEndpoint;
        const tx = await createDepositTransaction(
          { publicKey } as unknown as Keypair,
          amountNum,
          rpcEndpoint,
        );
        const signed = await signTransaction(tx);
        const sig = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });
        await connection.confirmTransaction(sig, 'confirmed');
        snackbar.success('Deposit submitted!');
        close();
      } catch (err) {
        console.error('deposit failed', err);
        snackbar.error(
          err instanceof Error ? err.message : String(err ?? 'Deposit failed'),
        );
      } finally {
        setIsLoading(false);
      }
    })();
  };

  return (
    <dialog
      className="deposit-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Deposit>'}</div>

        <div className="section">
          <div className="row">
            <div className="label">{'Wallet_USDC'}</div>
            <div className="value">{walletUsdcDisplay}</div>
          </div>
        </div>

        <div className="section">
          <div className="row">
            <div className="label">{'Deposit_Amount_USDC'}</div>
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
            {`Minimum ${MIN_DEPOSIT_USDC} USDC · Mainnet USDC required`}
          </div>
          {!addressMatch && isLogin && (
            <div className="hint hint--warn">
              {'Connected wallet must match your logged-in address.'}
            </div>
          )}
        </div>

        <ButtonDiv
          className="deposit-button"
          onClick={handleDeposit}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Depositing…>' : '<Deposit>'}
        </ButtonDiv>

        <ButtonDiv className="close-button" onClick={close}>
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default DepositDialog;
