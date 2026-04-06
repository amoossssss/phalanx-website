import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import useNotification from '@/utils/hooks/useNotification';
import { useUser } from '@/utils/contexts/UserContext';

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
}: SquadCardType) => {
  const navigate = useNavigate();
  const { refreshUser, mySquad } = useUser();
  const { snackbar } = useNotification();

  const full = memberCount >= 10;

  const handleJoinSquad = useCallback(async () => {
    try {
      await ApiService.squad.joinSquadOpen(squadId);
      await refreshUser();
      await refreshSquadList();
      snackbar.success(`Welcome to ${name}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: unknown } };
      const data = err?.response?.data;
      const message =
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : 'Could not join squad';
      snackbar.error(message);
    }
  }, [name, refreshSquadList, refreshUser, snackbar, squadId]);

  const handleViewSquad = () => {
    navigate(`/squad/${squadId}`);
  };

  return (
    <div className="squad-card">
      <div className="avatar-container">
        <img className="avatar" src={avatarUrl} alt={'avatar'} />
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
        <div className="squad-member-count">{`Member_Count: ${memberCount} / 10`}</div>
      </div>

      <div className="squad-earnings">
        <div className="earnings-item volume">
          <div>{'Total_Volume'}</div>
          <div className="earnings-number">
            {StringHelper.formatCompactNumber(volume)}
          </div>
        </div>

        <div className="earnings-item pnl">
          <div>{'Current_PnL'}</div>
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
    </div>
  );
};

export default SquadCard;
