import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import EditSquadDialog from '@/components/EditSquadDialog/EditSquadDialog';
import MemberList from '@/components/MemberList/MemberList';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import { MemberType, SquadType } from '@/utils/constants/Types';
import { useUser } from '@/utils/contexts/UserContext';
import { useAuth } from '@/utils/contexts/AuthContext';

import './SquadSpace.scss';

const SquadSpace = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = useParams<{ id: string }>();

  const { mySquad, refreshUser } = useUser();
  const { userAddress } = useAuth();

  const [squad, setSquad] = useState<SquadType | null>(null);
  const [memberList, setMemberList] = useState<MemberType[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const isMySquad = mySquad?.squadId === id;
  const isLeader =
    isMySquad &&
    memberList.findIndex(
      (item) => item.walletAddress === userAddress && item.role === 'captain',
    ) !== -1;

  const handleFetchSquad = useCallback(async () => {
    if (!id) return;
    const squadInfo = await ApiService.squad.getSquadById(id);
    if (squadInfo) {
      setSquad(squadInfo.squad);
      setMemberList(squadInfo.members);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      handleFetchSquad();
      return;
    }
    navigate('/squad');
  }, [id, navigate, handleFetchSquad]);

  const handleKickMember = useCallback(
    async (targetWallet: string) => {
      if (!id) return;
      try {
        await ApiService.squad.kickMember(id, targetWallet);
        await handleFetchSquad();
        await refreshUser();
        enqueueSnackbar('Member removed', { variant: 'success' });
      } catch {
        enqueueSnackbar('Could not remove member', { variant: 'error' });
      }
    },
    [id, handleFetchSquad, refreshUser, enqueueSnackbar],
  );

  const handleJoinSquad = () => {};

  const handleEditSquad = () => {
    setIsEditDialogOpen(true);
  };

  const handleLeaveSquad = () => {};

  if (!squad) return null;

  return (
    <div className="squad-space">
      <div
        className="squad-info-container"
        style={{ borderColor: squad.color }}
      >
        {squad.avatarUrl && (
          <img
            className="squad-avatar-container"
            src={squad.avatarUrl}
            alt="avatar"
          />
        )}

        <div className="squad-name-container">
          <div className="squad-name">{`${squad.name}`}</div>
          <div className="leader">
            <div>{'Leader: '}</div>
            <div className="leader-name">{`@${StringHelper.truncateName(
              squad.leader,
            )}`}</div>
          </div>
        </div>

        <div className="squad-earnings">
          <div className="earnings-item roi">
            <div>{'Total_ROI'}</div>
            <div className="earnings-number">{squad.ROI}</div>
          </div>

          <div className="earnings-item pnl">
            <div>{'Current_PnL'}</div>
            <div className="earnings-number">{squad.PnL}</div>
          </div>
        </div>

        {isMySquad && <div className="my-squad">{'My_Squad'}</div>}

        <div className="action-button-list">
          {squad && mySquad === null && (
            <ButtonDiv className="join-button" onClick={handleJoinSquad}>
              {'Join_Squad'}
            </ButtonDiv>
          )}
          {squad && isLeader && (
            <ButtonDiv className="edit-button" onClick={handleEditSquad}>
              {'Edit_Squad'}
            </ButtonDiv>
          )}
          {squad && isMySquad && (
            <ButtonDiv className="leave-button" onClick={handleLeaveSquad}>
              {'Leave_Squad'}
            </ButtonDiv>
          )}
        </div>
      </div>

      <div className="squad-content">
        <MemberList
          members={memberList}
          isLeader={isLeader}
          currentWalletAddress={userAddress}
          onKickMember={handleKickMember}
        />
      </div>

      {isEditDialogOpen && (
        <EditSquadDialog
          squad={squad}
          close={() => setIsEditDialogOpen(false)}
          onSaved={handleFetchSquad}
        />
      )}
    </div>
  );
};

export default SquadSpace;
