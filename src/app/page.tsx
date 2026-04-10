'use client';

import { Route, Routes, useLocation } from 'react-router';
import { useEffect, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import Home from '@/containers/Home/Home';
import Frontline from '@/containers/Frontline/Frontline';
import Squad from '@/containers/Squad/Squad';
import SquadSpace from '@/containers/SquadSpace/SquadSpace';
import Trade from '@/containers/Trade/Trade';

import Header from '@/components/Header/Header';

import ClientProvider from '@/lib/ClientProvider/ClientProvider';
import useWindowSize from '@/utils/hooks/useWindowSize';

import './app.scss';

const Body = () => {
  const location = useLocation();

  const { isWindowSmall } = useWindowSize();
  const windowSmallClassname = useMemo(() => {
    return isWindowSmall ? 'window-small' : '';
  }, [isWindowSmall]);

  const viewContainerClassName = useMemo(() => {
    const base = 'view-container';
    if (location.pathname === '/trade') {
      return `${base} view-container--trade`;
    }
    return base;
  }, [location.pathname]);

  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollToTop();
    // Run again after render in case layout shifts
    const id = requestAnimationFrame(() => {
      scrollToTop();
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <main className={windowSmallClassname}>
      <div className="app-container">
        <Header />
        <div className={viewContainerClassName}>
          <Routes>
            <Route path="/squad/:id" element={<SquadSpace />} />
            <Route path="/squad" element={<Squad />} />
            <Route path="/frontline" element={<Frontline />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </div>
    </main>
  );
};

export default function App() {
  return (
    <ErrorBoundary
      fallback={<div>{'Something went wrong, please refresh the page ⚡'}</div>}
    >
      <ClientProvider>
        <Body />
      </ClientProvider>
    </ErrorBoundary>
  );
}
