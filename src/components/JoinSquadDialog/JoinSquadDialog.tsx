import { useMemo, useState } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import ApiService from '@/utils/api/ApiService';
import Constants from '@/utils/constants/Constants';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';

import './JoinSquadDialog.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);

type JoinSquadDialogProps = {
  squadId: string;
  squadName: string;
  memberCount: number;
  leader: string;
  close: () => void;
  onJoined?: () => void | Promise<void>;
};

const JoinSquadDialog = ({
  squadId,
  squadName,
  memberCount,
  leader,
  close,
  onJoined,
}: JoinSquadDialogProps) => {
  const { snackbar } = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      squadId.length > 0 &&
      squadName.length > 0 &&
      memberCount < Constants.MAX_MEMBERS
    );
  }, [squadId, squadName, memberCount]);

  const handleConfirm = () => {
    if (!canSubmit) return;

    setIsLoading(true);
    void ApiService.squad
      .joinSquadOpen(squadId)
      .then(async () => {
        snackbar.success(`Welcome to ${squadName}`);
        await onJoined?.();
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
            : 'Could not join squad';
        snackbar.error(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <dialog
      className="join-squad-dialog"
      open
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">{'<Join_squad>'}</div>

        <div className="dialog-summary">
          <div className="row">
            <div className="label">{'Squad'}</div>
            <div className="value">{squadName}</div>
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
          {'You will join this squad as a member.'}
        </p>

        <ButtonDiv
          className="confirm-button"
          onClick={handleConfirm}
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? '<Joining…>' : '<Confirm_join>'}
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

export default JoinSquadDialog;
