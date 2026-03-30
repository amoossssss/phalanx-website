import { useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import StringHelper from '@/utils/helpers/StringHelper';

import './SquadCard.scss';

type SquadCardType = {
  avatarUrl: string;
  name: string;
  squadId: string;
  leader: string;
  memberCount: number;
  tags: string[];
  ROI: number;
  PnL: number;
  isMySquad: boolean;
};

const SquadCard = ({
  avatarUrl,
  name,
  squadId,
  leader,
  memberCount,
  tags,
  ROI,
  PnL,
  isMySquad,
}: SquadCardType) => {
  const navigate = useNavigate();
  const full = memberCount >= 10;

  const handleJoinSquad = () => {
    // TODO: join squad logic
  };

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
        <div className="earnings-item roi">
          <div>{'Total_ROI'}</div>
          <div className="earnings-number">{ROI}</div>
        </div>

        <div className="earnings-item pnl">
          <div>{'Current_PnL'}</div>
          <div className="earnings-number">{PnL}</div>
        </div>
      </div>

      <ButtonDiv
        className={`join-button ${full ? 'full' : ''}`}
        onClick={handleJoinSquad}
        disabled={full || isMySquad}
      >
        {full ? '>Squad_Full<' : isMySquad ? '<My_Squad>' : '<Join_Squad>'}
      </ButtonDiv>
    </div>
  );
};

export default SquadCard;
