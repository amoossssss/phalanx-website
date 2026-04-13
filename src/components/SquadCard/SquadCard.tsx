import { useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Constants from '@/utils/constants/Constants';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import { useUser } from '@/utils/contexts/UserContext';

import './SquadCard.scss';

type SquadCardType = {
  handleJoinSquad: () => void;
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
  handleJoinSquad,
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
  const { mySquad } = useUser();

  const full = memberCount >= 10;

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
          <div className="leader-name">
            <span className="leader-name__text">{`@${StringHelper.truncateName(
              leader,
            )}`}</span>
          </div>
        </div>
      </div>

      <div className="name-container">
        <ButtonDiv className="squad-name" onClick={handleViewSquad}>
          <span className="squad-name__text">{`> ${name}`}</span>
        </ButtonDiv>
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
          <div className={`earnings-number ${pnl < 0 ? 'negative' : ''}`}>
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
