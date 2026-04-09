import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import { SquadLeaderboardResponseType } from '@/utils/api/instances/squad/service';
import { useUser } from '@/utils/contexts/UserContext';

import './SquadLeaderboard.scss';

type SquadLeaderboardType = {
  leaderboardType: '24h' | 'total';
  leaderboardData: SquadLeaderboardResponseType | null;
};

const SquadLeaderboard = ({
  leaderboardType,
  leaderboardData,
}: SquadLeaderboardType) => {
  const navigate = useNavigate();
  const { mySquad } = useUser();

  const isDay = leaderboardType === '24h';

  const data = useMemo(() => {
    if (leaderboardData === null) return [];
    return leaderboardData.items
      .sort((a, b) => a.volume_rank - b.volume_rank)
      .slice(0, 5);
  }, [leaderboardData]);

  const handleSquadClick = (squadId: string) => {
    navigate(`/squad/${squadId}`);
  };

  return (
    <div className="squad-leaderboard">
      <div className="leaderboard-title">{`<${leaderboardType}_Squad_Rankings>`}</div>
      <div className="squad-list">
        {data.map((item, index) => {
          const pnl = isDay ? item.pnl_1d : item.pnl_total;
          const volume = isDay ? item.volume_1d : item.volume_total;

          return (
            <ButtonDiv
              className="squad-leaderboard-content"
              key={item.squad.id}
              onClick={() => handleSquadClick(item.squad.id)}
            >
              <img
                className="squad-avatar"
                src={
                  item.squad.avatar_url ? item.squad.avatar_url : Media.favicon
                }
                alt={'squad'}
                style={{ boxShadow: `0 0 2px 2px ${item.squad.color}` }}
              />
              <div className="info-section">
                <div className="squad-name">{`> ${item.squad.name}`}</div>
                <div className="squad-info">
                  <div className="info-title">{`${leaderboardType}_Volume:`}</div>
                  <div className="info-content volume">
                    {`${StringHelper.formatCompactNumber(volume)}`}
                  </div>
                </div>
                <div className="squad-info">
                  <div className="info-title">{`${leaderboardType}_PnL:`}</div>
                  <div className={`info-content ${pnl < 0 ? 'negative' : ''}`}>
                    {`${StringHelper.formatCompactNumber(pnl)}`}
                  </div>
                </div>
              </div>
              <div className="rank-tag">{`#0${index + 1}`}</div>
              {mySquad?.squadId === item.squad.id && (
                <div className="my-squad-tag">{'My_Squad'}</div>
              )}
            </ButtonDiv>
          );
        })}
      </div>
      <NavLink to={'/squad'} target={'_self'} className="view-squad-button">
        {'<All_Squads>'}
      </NavLink>
    </div>
  );
};

export default SquadLeaderboard;
