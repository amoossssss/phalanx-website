import { ReactNode, Fragment } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

import NoSSR from '@/lib/NoSSR/NoSSR';

import { AuthProvider } from '@/utils/contexts/AuthContext';

import '@/utils/i18n/i18n';

const ClientProvider = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient();

  const providers = [
    { provider: QueryClientProvider, props: { client } },
    { provider: NoSSR, props: {} },
    { provider: BrowserRouter, props: {} },
    { provider: SnackbarProvider, props: {} },
    { provider: AuthProvider, props: {} },
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
