import { ReactNode, Fragment } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';

import NoSSR from '@/lib/NoSSR/NoSSR';
import SolanaWalletProviders from '@/lib/SolanaWalletProviders/SolanaWalletProviders';

import { AuthProvider } from '@/utils/contexts/AuthContext';
import { UserProvider } from '@/utils/contexts/UserContext';

const AuthThenUser = ({ children }: { children: ReactNode }) => (
  <AuthProvider>
    <UserProvider>{children}</UserProvider>
  </AuthProvider>
);

const SolanaThenAuth = ({ children }: { children: ReactNode }) => (
  <SolanaWalletProviders>
    <AuthThenUser>{children}</AuthThenUser>
  </SolanaWalletProviders>
);

const ClientProvider = ({ children }: { children: ReactNode }) => {
  const providers = [
    { provider: NoSSR, props: {} },
    { provider: BrowserRouter, props: {} },
    { provider: SnackbarProvider, props: {} },
    { provider: SolanaThenAuth, props: {} },
  ];

  return (
    <Fragment>
      {providers.reduceRight(
        (accum, { provider: ProviderComponent, props: ProviderProps }) => {
          return (
            // @ts-ignore
            <ProviderComponent {...ProviderProps}>{accum}</ProviderComponent>
          );
        },
        children,
      )}
    </Fragment>
  );
};

export default ClientProvider;
