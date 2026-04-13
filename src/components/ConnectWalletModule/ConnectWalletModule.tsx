import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import bs58 from 'bs58';

import DepositDialog from '@/components/DepositDialog/DepositDialog';
import UpdateAliasDialog from '@/components/UpdateAliasDialog/UpdateAliasDialog';
import WithdrawDialog from '@/components/WithdrawDialog/WithdrawDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import './ConnectWalletModule.scss';

const ConnectWalletModule = () => {
  const { publicKey, connected, connecting, disconnect, signMessage } =
    useWallet();
  const { visible, setVisible } = useWalletModal();

  const { isLogin, userAddress, login, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [isUpdateAliasOpen, setIsUpdateAliasOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const pendingSignInRef = useRef(false);

  const displayAddress = StringHelper.truncateAddress(userAddress ?? '');

  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!rootRef.current.contains(e.target)) closeDropdown();
    };

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [closeDropdown]);

  // Do not clear pending sign-in while `connecting` is true: the modal often
  // closes before `connected` flips to true, which would otherwise clear the
  // ref and skip the signature step until the user clicks again.
  useEffect(() => {
    if (!visible && pendingSignInRef.current && !connected && !connecting) {
      pendingSignInRef.current = false;
    }
  }, [visible, connected, connecting]);

  const runAuth = useCallback(
    async (walletAddress: string) => {
      if (!signMessage) {
        throw new Error('This wallet does not support message signing');
      }

      const challenge = await ApiService.auth.getNonce(walletAddress);
      const messageBytes = new TextEncoder().encode(challenge.message);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      await ApiService.auth.verify({
        wallet_address: walletAddress,
        signature: signatureBase58,
        nonce: challenge.nonce,
        issued_at: challenge.issued_at,
        challenge_token: challenge.challenge_token,
      });

      login(walletAddress);
    },
    [signMessage, login],
  );

  const handleConnect = useCallback(async () => {
    if (connected && publicKey) {
      try {
        await runAuth(publicKey.toBase58());
      } catch (e) {
        console.error(e);
      }
      return;
    }

    pendingSignInRef.current = true;
    setVisible(true);
  }, [connected, publicKey, runAuth, setVisible]);

  useEffect(() => {
    if (!pendingSignInRef.current || !connected || !publicKey || isLogin) {
      return;
    }

    pendingSignInRef.current = false;

    void runAuth(publicKey.toBase58()).catch((e) => {
      console.error(e);
    });
  }, [connected, publicKey, isLogin, runAuth]);

  const handleLogout = useCallback(async () => {
    closeDropdown();

    try {
      await disconnect();
    } catch {
      // ignore wallet disconnect errors
    }

    logout();
  }, [closeDropdown, disconnect, logout]);

  const handleUpdateAlias = () => {
    setIsUpdateAliasOpen(true);
    setIsDropdownOpen(false);
  };

  const handleDeposit = () => {
    setIsDepositOpen(true);
    setIsDropdownOpen(false);
  };

  const handleWithdraw = () => {
    setIsWithdrawOpen(true);
    setIsDropdownOpen(false);
  };

  const connectBusy = connecting && !connected;

  return (
    <div className="connect-wallet-module" ref={rootRef}>
      {!isLogin ? (
        <ButtonDiv
          className="connect-button"
          onClick={handleConnect}
          disabled={connectBusy}
        >
          {connectBusy ? 'Connecting…' : 'Connect Wallet'}
        </ButtonDiv>
      ) : (
        <div className="logged-in-container" role="menuitem">
          <ButtonDiv
            className="connect-button"
            onClick={() => setIsDropdownOpen((v) => !v)}
          >
            {displayAddress}
          </ButtonDiv>
          {isDropdownOpen && (
            <div className="dropdown" role="menu">
              <ButtonDiv className="dropdown-item" onClick={handleUpdateAlias}>
                {'Update_Alias'}
              </ButtonDiv>
              <ButtonDiv className="dropdown-item" onClick={handleDeposit}>
                {'Deposit'}
              </ButtonDiv>
              <ButtonDiv className="dropdown-item" onClick={handleWithdraw}>
                {'Withdraw'}
              </ButtonDiv>
              <ButtonDiv className="dropdown-item" onClick={handleLogout}>
                {'Logout'}
              </ButtonDiv>
            </div>
          )}
        </div>
      )}

      {isUpdateAliasOpen && (
        <UpdateAliasDialog close={() => setIsUpdateAliasOpen(false)} />
      )}
      {isDepositOpen && <DepositDialog close={() => setIsDepositOpen(false)} />}
      {isWithdrawOpen && (
        <WithdrawDialog close={() => setIsWithdrawOpen(false)} />
      )}
    </div>
  );
};

export default ConnectWalletModule;
