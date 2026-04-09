import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import JoinSquadDialog from '@/components/JoinSquadDialog/JoinSquadDialog';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Constants from '@/utils/constants/Constants';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useUser } from '@/utils/contexts/UserContext';
import { useAuth } from '@/utils/contexts/AuthContext';

import './SquadCard.scss';

type SquadCardType = {
  refreshSquadList: () => Promise<void>;
  avatarUrl: string;
  name: string;
  squadId: string;
  leader: string;
  memberCount: number;
  tags: string[];
  volume: number;
  pnl: number;
  isMySquad: boolean;
  color: string;
};

const SquadCard = ({
  refreshSquadList,
  avatarUrl,
  name,
  squadId,
  leader,
  memberCount,
  tags,
  volume,
  pnl,
  isMySquad,
  color,
}: SquadCardType) => {
  const navigate = useNavigate();
  const { refreshUser, mySquad } = useUser();
  const { isLogin } = useAuth();
  const { snackbar } = useNotification();

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const full = memberCount >= 10;

  const handleJoinSquad = () => {
    if (!isLogin) {
      snackbar.error('Connect wallet to join squad.');
      return;
    }
    setJoinDialogOpen(true);
  };

  const handleJoined = useCallback(async () => {
    await refreshUser();
    await refreshSquadList();
  }, [refreshSquadList, refreshUser]);

  const handleViewSquad = () => {
    navigate(`/squad/${squadId}`);
  };

  return (
    <div className="squad-card">
      <div className="avatar-container">
        <img
          className="avatar"
          src={avatarUrl ? avatarUrl : Media.favicon}
          alt={'avatar'}
          style={{ boxShadow: `0 0 2px 2px ${color}` }}
        />
        <div className="leader">
          <div>{'Leader'}</div>
          <div className="leader-name">{`@${StringHelper.truncateName(
            leader,
          )}`}</div>
        </div>
      </div>

      <div className="name-container">
        <ButtonDiv
          className="squad-name"
          onClick={handleViewSquad}
        >{`> ${name}`}</ButtonDiv>
        <div className="squad-member-count">{`Member_Count: ${memberCount} / ${Constants.MAX_MEMBERS}`}</div>
      </div>

      <div className="squad-earnings">
        <div className="earnings-item volume">
          <div>{'Total_Volume'}</div>
          <div className="earnings-number">
            {StringHelper.formatCompactNumber(volume)}
          </div>
        </div>

        <div className="earnings-item pnl">
          <div>{'Total_PnL'}</div>
          <div className="earnings-number">
            {StringHelper.formatCompactNumber(pnl)}
          </div>
        </div>
      </div>

      <ButtonDiv
        className={`join-button ${full ? 'full' : ''}`}
        onClick={handleJoinSquad}
        disabled={full || isMySquad || mySquad !== null}
      >
        {full ? '>Squad_Full<' : isMySquad ? '<My_Squad>' : '<Join_Squad>'}
      </ButtonDiv>

      {joinDialogOpen && (
        <JoinSquadDialog
          squadId={squadId}
          squadName={name}
          memberCount={memberCount}
          leader={leader}
          close={() => setJoinDialogOpen(false)}
          onJoined={handleJoined}
        />
      )}
    </div>
  );
};

export default SquadCard;
