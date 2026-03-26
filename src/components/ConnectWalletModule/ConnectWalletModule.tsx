import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import bs58 from 'bs58';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import { useAuth } from '@/utils/contexts/AuthContext';

import './ConnectWalletModule.scss';

type PhantomProvider = {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signMessage: (
    message: Uint8Array,
  ) => Promise<{ signature: Uint8Array } | Uint8Array>;
};

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyWindow = window as any;
  return anyWindow?.solana ?? null;
}

const ConnectWalletModule = () => {
  const { isLogin, userAddress, login, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const displayAddress = useMemo(
    () => StringHelper.truncateAddress(userAddress ?? ''),
    [userAddress],
  );

  const closeDropdown = useCallback(() => setIsDropdownOpen(false), []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!rootRef.current.contains(e.target)) closeDropdown();
    }

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [closeDropdown]);

  const handleConnect = useCallback(async () => {
    const provider = getPhantomProvider();
    if (!provider?.isPhantom) {
      window.open('https://phantom.app/', '_blank', 'noopener,noreferrer');
      return;
    }

    const connectRes = await provider.connect();
    const walletAddress = connectRes.publicKey.toString();

    const challenge = await ApiService.auth.getNonce(walletAddress);

    const messageBytes = new TextEncoder().encode(challenge.message);

    const signed = await provider.signMessage(messageBytes);
    const signatureBytes =
      signed instanceof Uint8Array ? signed : signed.signature;
    const signatureBase58 = bs58.encode(signatureBytes);

    await ApiService.auth.verify({
      wallet_address: walletAddress,
      signature: signatureBase58,
      nonce: challenge.nonce,
      issued_at: challenge.issued_at,
      challenge_token: challenge.challenge_token,
    });

    login(walletAddress);
  }, [login]);

  const handleLogout = useCallback(async () => {
    closeDropdown();

    try {
      const provider = getPhantomProvider();
      await provider?.disconnect?.();
    } catch {
      // ignore wallet disconnect errors
    }

    logout();
  }, [closeDropdown, logout]);

  return (
    <div className="connect-wallet-module" ref={rootRef}>
      {!isLogin ? (
        <ButtonDiv className="connect-button" onClick={handleConnect}>
          {'Connect Wallet'}
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
              <ButtonDiv className="dropdown-item" onClick={handleLogout}>
                {'Logout'}
              </ButtonDiv>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectWalletModule;
