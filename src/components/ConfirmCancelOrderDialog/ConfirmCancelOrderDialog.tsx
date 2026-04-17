import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';
import PacificaHelper, {
  type PacificaOpenOrder,
} from '@/utils/helpers/PacificaHelper';
import PositionHelper from '@/utils/helpers/PositionHelper';
import useNotification from '@/utils/hooks/useNotification';
import useWalletAuth from '@/utils/hooks/useWalletAuth';

import './ConfirmCancelOrderDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type ConfirmCancelOrderDialogProps = {
  order: PacificaOpenOrder;
  close: () => void;
  /** Called after a successful cancel so the list can update optimistically. */
  onCancelled?: (order: PacificaOpenOrder) => void;
};

const ConfirmCancelOrderDialog = ({
  order,
  close,
  onCancelled,
}: ConfirmCancelOrderDialogProps) => {
  const {
    isLogin,
    userAddress,
    signMessage,
    activeWalletAddress,
    isActiveWalletSameAsSession,
    walletReadyForSigningMessage,
    openWalletModal,
  } = useWalletAuth();
  const { snackbar } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!order.symbol) return false;
    if (!isLogin || !userAddress) return false;
    if (!walletReadyForSigningMessage) return false;
    if (!isActiveWalletSameAsSession) return false;
    if (
      order.orderId <= 0 &&
      !(order.clientOrderId && order.clientOrderId.length > 0)
    ) {
      return false;
    }
    return true;
  }, [
    isActiveWalletSameAsSession,
    isLogin,
    order,
    userAddress,
    walletReadyForSigningMessage,
  ]);

  const handleConfirm = () => {
    if (!canSubmit) return;
    if (!userAddress || !signMessage) return;

    setIsLoading(true);
    void PacificaHelper.cancelOrder({
      account: userAddress,
      symbol: order.symbol,
      orderId: order.orderId > 0 ? order.orderId : undefined,
      clientOrderId: order.clientOrderId,
      signMessage,
    })
      .then(() => {
        snackbar.success('Order cancelled');
        onCancelled?.(order);
        close();
      })
      .catch((err) => {
        console.error('cancel order failed', err);
        snackbar.error(err?.toString?.() ?? 'Cancel order failed');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const sideLabel = PositionHelper.sideTag(order.side);
  const handleReconnectWallet = () => openWalletModal();

  return (
    <dialog
      className="confirm-cancel-order-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Cancel_order>'}</div>

        {!walletReadyForSigningMessage ? (
          <div className="dialog-summary">
            <div className="row">
              <div className="value">{'Reconnect wallet to cancel order.'}</div>
            </div>
            <ButtonDiv
              className="confirm-button"
              onClick={handleReconnectWallet}
              disabled={isLoading}
            >
              {'<Reconnect wallet>'}
            </ButtonDiv>
          </div>
        ) : !isActiveWalletSameAsSession ? (
          <div className="dialog-summary">
            <div className="row">
              <div className="label">{'Wallet'}</div>
              <div className="value">
                {`Connected wallet does not match session. Active: ${activeWalletAddress}`}
              </div>
            </div>
          </div>
        ) : null}

        <div className="dialog-summary">
          <div className="row">
            <div className="label">{'Symbol'}</div>
            <div className="value">{order.symbol}</div>
          </div>
          <div className="row">
            <div className="label">{'Side'}</div>
            <div className="value">{sideLabel}</div>
          </div>
          <div className="row">
            <div className="label">{'Order_ID'}</div>
            <div className="value">
              {order.orderId > 0 ? String(order.orderId) : '—'}
            </div>
          </div>
          <div className="row">
            <div className="label">{'Type'}</div>
            <div className="value">{order.orderType}</div>
          </div>
          <div className="row">
            <div className="label">{'Size'}</div>
            <div className="value">{order.initialAmount}</div>
          </div>
          {order.price && Number(String(order.price).replace(/,/g, '')) > 0 ? (
            <div className="row">
              <div className="label">{'Price'}</div>
              <div className="value">{order.price}</div>
            </div>
          ) : null}
        </div>

        <ButtonDiv
          className="confirm-button"
          onClick={handleConfirm}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Cancelling…>' : '<Confirm_cancel>'}
        </ButtonDiv>

        <ButtonDiv
          className="close-button"
          onClick={close}
          disabled={isLoading}
        >
          <CloseIcon color={'#ff51fa'} size={20} />
        </ButtonDiv>
      </div>
    </dialog>
  );
};

export default ConfirmCancelOrderDialog;
