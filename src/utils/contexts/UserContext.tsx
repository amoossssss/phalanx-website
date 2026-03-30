import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import ApiService from '@/utils/api/ApiService';
import type { SquadType } from '@/utils/constants/Types';

import { useAuth } from '@/utils/contexts/AuthContext';

type UserContextValue = {
  mySquad: SquadType | null;
  alias: string | null;
  setAlias: (value: string | null) => void;
  setMySquad: (value: SquadType | null) => void;
  isUserReady: boolean;
  refreshUser: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthReady, isLogin, userAddress } = useAuth();
  const [mySquad, setMySquad] = useState<SquadType | null>(null);
  const [alias, setAlias] = useState<string | null>(null);

  const [isUserReady, setIsUserReady] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!isLogin || !userAddress) {
      setAlias(null);
      setMySquad(null);
      return;
    }

    const [meRes, squadRes] = await Promise.allSettled([
      ApiService.auth.me(),
      ApiService.squad.getMySquad(),
    ]);

    let alias: string | null = null;
    if (meRes.status === 'fulfilled') {
      alias = meRes.value.alias ?? null;
    }

    let squad: SquadType | null = null;
    if (squadRes.status === 'fulfilled') {
      squad = squadRes.value;
    }

    setAlias(alias);
    setMySquad(squad);
  }, [isLogin, userAddress]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!isLogin) {
      setAlias(null);
      setMySquad(null);
      setIsUserReady(true);
      return;
    }

    let cancelled = false;
    setIsUserReady(false);

    (async () => {
      try {
        await refreshUser();
      } finally {
        if (!cancelled) {
          setIsUserReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isLogin, userAddress, refreshUser]);

  const value = useMemo(
    () => ({
      alias,
      mySquad,
      setAlias,
      setMySquad,
      isUserReady,
      refreshUser,
    }),
    [alias, mySquad, isUserReady, refreshUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
