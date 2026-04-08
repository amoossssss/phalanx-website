import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
import Constants from '@/utils/constants/Constants';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';

import './LeaveSquadDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type LeaveSquadDialogProps = {
  squadId: string;
  squadName: string;
  leader: string;
  memberCount: number;
  close: () => void;
  onLeft?: () => void | Promise<void>;
};

const LeaveSquadDialog = ({
  squadId,
  squadName,
  leader,
  memberCount,
  close,
  onLeft,
}: LeaveSquadDialogProps) => {
  const { snackbar } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return squadId.length > 0 && squadName.length > 0;
  }, [squadId, squadName]);

  const handleConfirm = () => {
    if (!canSubmit) return;

    setIsLoading(true);
    void ApiService.squad
      .leaveSquad(squadId)
      .then(async () => {
        snackbar.success(`Left ${squadName}`);
        await onLeft?.();
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
            : 'Something went wrong, please try again.';
        snackbar.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <dialog
      className="leave-squad-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Leave_squad>'}</div>

        <div className="dialog-summary">
          <div className="row">
            <div className="label">{'Squad'}</div>
            <div className="value">{`> ${squadName}`}</div>
          </div>
          <div className="row">
            <div className="label">{'Leader'}</div>
            <div className="value">
              {`@${StringHelper.truncateName(leader)}`}
            </div>
          </div>
          <div className="row">
            <div className="label">{'Members'}</div>
            <div className="value">{`${memberCount} / ${Constants.MAX_MEMBERS}`}</div>
          </div>
        </div>

        <p className="dialog-warning">
          {'You will lose access to this squad immediately.'}
        </p>

        <ButtonDiv
          className="confirm-button"
          onClick={handleConfirm}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Leaving…>' : '<Confirm_leave>'}
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

export default LeaveSquadDialog;
