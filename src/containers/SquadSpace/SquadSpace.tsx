import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useNavigate } from 'react-router-dom';

import ConfirmKickMemberDialog from '@/components/ConfirmKickMemberDialog/ConfirmKickMemberDialog';
import EditSquadDialog from '@/components/EditSquadDialog/EditSquadDialog';
import JoinSquadDialog from '@/components/JoinSquadDialog/JoinSquadDialog';
import LeaveSquadDialog from '@/components/LeaveSquadDialog/LeaveSquadDialog';
import Heatmap from '@/components/Heatmap/Heatmap';
import MemberList from '@/components/MemberList/MemberList';
import VolumeChart from '@/components/VolumeChart/VolumeChart';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import { MemberType, SquadType } from '@/utils/constants/Types';
import { useUser } from '@/utils/contexts/UserContext';
import { useAuth } from '@/utils/contexts/AuthContext';

import './SquadSpace.scss';

const SquadSpace = () => {
  const { snackbar } = useNotification();
  const { mySquad, refreshUser } = useUser();
  const { userAddress } = useAuth();

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [squad, setSquad] = useState<SquadType | null>(null);
  const [memberList, setMemberList] = useState<MemberType[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [kickMemberTarget, setKickMemberTarget] = useState<MemberType | null>(
    null,
  );

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

  const handleRequestKickMember = useCallback((member: MemberType) => {
    setKickMemberTarget(member);
  }, []);

  const handleKickSucceeded = useCallback(async () => {
    await handleFetchSquad();
    await refreshUser();
  }, [handleFetchSquad, refreshUser]);

  const handleJoinedSquad = useCallback(async () => {
    await refreshUser();
    await handleFetchSquad();
  }, [refreshUser, handleFetchSquad]);

  const handleEditSquad = useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  const handleLeftSquad = useCallback(async () => {
    await refreshUser();
    navigate('/squad');
  }, [refreshUser, navigate]);

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
            style={{ boxShadow: `0 0 2px 2px ${squad.color}` }}
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
          <div className="earnings-item volume">
            <div>{'Total_Volume'}</div>
            <div className="earnings-number">
              {StringHelper.formatCompactNumber(squad.volume)}
            </div>
          </div>

          <div className="earnings-item pnl">
            <div>{'Total_PnL'}</div>
            <div
              className={`earnings-number ${squad.pnl < 0 ? 'negative' : ''}`}
            >
              {StringHelper.formatCompactNumber(squad.pnl)}
            </div>
          </div>
        </div>

        {isMySquad && <div className="my-squad">{'<My_Squad>'}</div>}

        <div className="action-button-list">
          {squad && mySquad === null && (
            <ButtonDiv
              className="join-button"
              onClick={() => setIsJoinDialogOpen(true)}
            >
              {'<Join_Squad>'}
            </ButtonDiv>
          )}
          {squad && isLeader && (
            <ButtonDiv className="edit-button" onClick={handleEditSquad}>
              {'<Edit_Squad>'}
            </ButtonDiv>
          )}
          {squad && isMySquad && (
            <ButtonDiv
              className="leave-button"
              onClick={() => setIsLeaveDialogOpen(true)}
            >
              {'<Leave_Squad>'}
            </ButtonDiv>
          )}
        </div>
      </div>

      <div className="squad-content">
        <div className="left-section">
          <MemberList
            members={memberList}
            isLeader={isLeader}
            currentWalletAddress={userAddress}
            onKickMember={handleRequestKickMember}
            squadColor={squad.color}
          />
        </div>
        <div className="right-section">
          <Heatmap
            squadId={squad.squadId}
            memberCount={squad.memberCount}
            squadColor={squad.color}
          />
          <VolumeChart members={memberList} squadColor={squad.color} />
        </div>
      </div>

      {kickMemberTarget && id && (
        <ConfirmKickMemberDialog
          squadId={id}
          member={kickMemberTarget}
          close={() => setKickMemberTarget(null)}
          onKicked={handleKickSucceeded}
        />
      )}

      {isJoinDialogOpen && squad && (
        <JoinSquadDialog
          squadId={squad.squadId}
          squadName={squad.name}
          memberCount={squad.memberCount}
          leader={squad.leader}
          close={() => setIsJoinDialogOpen(false)}
          onJoined={handleJoinedSquad}
        />
      )}

      {isLeaveDialogOpen && squad && (
        <LeaveSquadDialog
          squadId={squad.squadId}
          squadName={squad.name}
          leader={squad.leader}
          memberCount={squad.memberCount}
          close={() => setIsLeaveDialogOpen(false)}
          onLeft={handleLeftSquad}
        />
      )}

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
