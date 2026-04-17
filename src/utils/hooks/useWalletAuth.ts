import { useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

import { useAuth } from '@/utils/contexts/AuthContext';

/**
 * Centralized wallet/session readiness for any signed action.
 *
 * Notes:
 * - We do NOT auto-trigger signature prompts here; wallets commonly block that.
 * - Call `openWalletModal()` (or `ensureWalletReadyForSigning()`) from a user action.
 */
export default function useWalletAuth() {
  const { isLogin, userAddress } = useAuth();
  const { connected, publicKey, signMessage, signTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const activeWalletAddress = useMemo(() => {
    return publicKey?.toBase58?.() ?? '';
  }, [publicKey]);

  const walletReadyForSigningMessage = useMemo(() => {
    return !!connected && !!publicKey && !!signMessage;
  }, [connected, publicKey, signMessage]);

  const walletReadyForSigningTransaction = useMemo(() => {
    return !!connected && !!publicKey && !!signTransaction;
  }, [connected, publicKey, signTransaction]);

  const isActiveWalletSameAsSession = useMemo(() => {
    return (
      !!userAddress &&
      !!activeWalletAddress &&
      userAddress === activeWalletAddress
    );
  }, [activeWalletAddress, userAddress]);

  const openWalletModal = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const ensureWalletReadyForSigning = useCallback(
    (mode: 'message' | 'transaction'): boolean => {
      if (!isLogin || !userAddress) return false;
      if (!isActiveWalletSameAsSession) return false;
      const ready =
        mode === 'message'
          ? walletReadyForSigningMessage
          : walletReadyForSigningTransaction;
      if (!ready) {
        setVisible(true);
        return false;
      }
      return true;
    },
    [
      isActiveWalletSameAsSession,
      isLogin,
      setVisible,
      userAddress,
      walletReadyForSigningMessage,
      walletReadyForSigningTransaction,
    ],
  );

  return {
    isLogin,
    userAddress,
    connected,
    publicKey,
    signMessage,
    signTransaction,
    activeWalletAddress,
    isActiveWalletSameAsSession,
    walletReadyForSigningMessage,
    walletReadyForSigningTransaction,
    openWalletModal,
    ensureWalletReadyForSigning,
  };
}
