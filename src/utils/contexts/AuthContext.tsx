import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import ApiService from '@/utils/api/ApiService';

type AuthContextValue = {
  isLogin: boolean;
  setIsLogin: (isLogin: boolean) => void;
  isAuthReady: boolean;
  userAddress: string;
  setUserAddress: (address: string) => void;
  login: (address: string, navigateToPath?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  const login = useCallback(
    (address: string, navigateToPath?: string) => {
      setUserAddress(address);
      setIsLogin(true);

      if (navigateToPath) {
        navigate(navigateToPath);
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    ApiService.auth
      .logout()
      .then(() => {
        setUserAddress('');
        setIsLogin(false);
      })
      .catch((error) => {
        console.error(error);
        setUserAddress('');
        setIsLogin(false);
      });
  }, [navigate]);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const data = await ApiService.auth.me();
        login(data.wallet_address);
      } catch {
        // not logged in, leave as anonymous
      } finally {
        setIsAuthReady(true);
      }
    };

    checkLogin();
  }, [login]);

  const value = useMemo(
    () => ({
      isLogin,
      setIsLogin,
      isAuthReady,
      userAddress,
      setUserAddress,
      login,
      logout,
    }),
    [isLogin, isAuthReady, userAddress, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
