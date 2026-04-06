import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';
import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import { MemberType } from '@/utils/constants/Types';

import './ConfirmKickMemberDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type ConfirmKickMemberDialogProps = {
  squadId: string;
  member: MemberType;
  close: () => void;
  onKicked?: () => void | Promise<void>;
};

const ConfirmKickMemberDialog = ({
  squadId,
  member,
  close,
  onKicked,
}: ConfirmKickMemberDialogProps) => {
  const { snackbar } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return squadId.length > 0 && member.walletAddress.length > 0;
  }, [squadId, member.walletAddress]);

  const displayName = member.alias
    ? `@${member.alias}`
    : `@${StringHelper.truncateAddress(member.walletAddress)}`;

  const handleConfirm = () => {
    if (!canSubmit) return;

    setIsLoading(true);
    void ApiService.squad
      .kickMember(squadId, member.walletAddress)
      .then(async () => {
        snackbar.success('Member removed');
        await onKicked?.();
        close();
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: unknown } };
        const data = e?.response?.data;
        const message =
          data &&
          typeof data === 'object' &&
          'error' in data &&
          typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : 'Could not remove member';
        snackbar.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <dialog
      className="confirm-kick-member-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Kick_member>'}</div>

        <div className="dialog-summary">
          <div className="row">
            <div className="label">{'Member'}</div>
            <div className="value">{displayName}</div>
          </div>
          <div className="row">
            <div className="label">{'Wallet'}</div>
            <div className="value">
              {StringHelper.truncateAddress(member.walletAddress)}
            </div>
          </div>
          <div className="row">
            <div className="label">{'Role'}</div>
            <div className="value">
              {member.role === 'captain' ? 'Leader' : 'Member'}
            </div>
          </div>
        </div>

        <p className="dialog-warning">
          {'They will lose access to this squad immediately.'}
        </p>

        <ButtonDiv
          className="confirm-button"
          onClick={handleConfirm}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Removing…>' : '<Confirm_kick>'}
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

export default ConfirmKickMemberDialog;
