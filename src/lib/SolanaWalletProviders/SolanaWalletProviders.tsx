'use client';
import { type ReactNode, useMemo } from 'react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import '@solana/wallet-adapter-react-ui/styles.css';

const DEFAULT_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

type SolanaWalletProvidersProps = {
  children: ReactNode;
};

const SolanaWalletProviders = ({ children }: SolanaWalletProvidersProps) => {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_MAINNET_RPC;

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaWalletProviders;
