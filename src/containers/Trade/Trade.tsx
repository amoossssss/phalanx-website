import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';

import BuilderCodeDialog from '@/components/BuilderCodeDialog/BuilderCodeDialog';
import TradingPanel from '@/components/TradingPanel/TradingPanel';

import EnvVariables from '@/utils/constants/EnvVariables';
import PacificaHelper, {
  PacificaMarketInfo,
} from '@/utils/helpers/PacificaHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useAuth } from '@/utils/contexts/AuthContext';

import './Trade.scss';

const Trade = () => {
  const navigate = useNavigate();
  const { snackbar } = useNotification();
  const { isLogin, userAddress } = useAuth();
  const { publicKey, signMessage, connected } = useWallet();

  const builderCode = EnvVariables.PACIFICA_BUILDER_CODE;
  const maxFeeRate = EnvVariables.PACIFICA_MAX_FEE_RATE;

  const [markets, setMarkets] = useState<PacificaMarketInfo[]>([]);

  const [isChecking, setIsChecking] = useState(false);
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const canCheck = useMemo(
    () => isLogin && userAddress && builderCode,
    [isLogin, userAddress, builderCode],
  );

  const checkApproval = useCallback(async () => {
    if (!canCheck) {
      setIsApproved(null);
      return;
    }

    setIsChecking(true);
    try {
      const approvals = await PacificaHelper.fetchBuilderApprovals(userAddress);
      const approved = approvals.some((a) => a.builder_code === builderCode);
      setIsApproved(approved);
    } catch (err) {
      setIsApproved(false);
      snackbar.error('Could not verify builder approval. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, [canCheck, userAddress, builderCode, snackbar]);

  const handleAuthorize = useCallback(async () => {
    if (!connected || !publicKey || !signMessage) {
      snackbar.error('Please connect a wallet that supports message signing.');
      return;
    }
    if (!userAddress || !builderCode) {
      snackbar.error('Missing wallet address or builder code.');
      return;
    }

    setIsAuthorizing(true);
    try {
      await PacificaHelper.approveBuilderCode({
        account: userAddress,
        builderCode,
        maxFeeRate,
        signMessage,
      });
      snackbar.success('Builder code authorized!');
      setIsApproved(true);
      await checkApproval();
    } catch (err) {
      snackbar.error('Authorization failed. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  }, [
    connected,
    publicKey,
    signMessage,
    userAddress,
    builderCode,
    maxFeeRate,
    snackbar,
    checkApproval,
  ]);

  const showDialog = canCheck && isApproved === false;
  const subtitle = isChecking
    ? '> Checking builder authorization…'
    : isApproved
    ? '> Builder code authorized'
    : '> Builder code not authorized';

  const fetchMarkets = useCallback(async () => {
    const markets = await PacificaHelper.getMarkets();
    setMarkets(markets);
  }, []);

  useEffect(() => {
    void checkApproval();
  }, [checkApproval]);

  useEffect(() => {
    void fetchMarkets();
  }, [fetchMarkets]);

  return (
    <div className="trade">
      {showDialog && (
        <BuilderCodeDialog
          builderCode={builderCode}
          maxFeeRate={maxFeeRate}
          onAuthorize={handleAuthorize}
          isAuthorizing={isAuthorizing}
          onClose={() => navigate('/')}
        />
      )}

      <TradingPanel markets={markets} initialMarket="BTC" />
    </div>
  );
};

export default Trade;
