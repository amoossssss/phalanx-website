import { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import { SquadLeaderboardResponseType } from '@/utils/api/instances/squad/service';
import { useUser } from '@/utils/contexts/UserContext';

import SquadLeaderboardSkeleton from './SquadLeaderboardSkeleton';

import './SquadLeaderboard.scss';

type SquadLeaderboardType = {
  leaderboardType: '24h' | 'total';
  leaderboardData: SquadLeaderboardResponseType | null;
  /** When true, shows a placeholder matching the leaderboard layout. */
  isLoading?: boolean;
};

const SquadLeaderboard = ({
  leaderboardType,
  leaderboardData,
  isLoading = false,
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

  const mySquadInfo = useMemo(() => {
    if (!mySquad || !leaderboardData) return null;
    const mySquadIndex = leaderboardData.items.findIndex(
      (item) => item.squad.id === mySquad.squadId,
    );
    if (mySquadIndex === -1) return null;
    const mySquadData = leaderboardData.items[mySquadIndex];
    return {
      pnl: isDay ? mySquadData.pnl_1d : mySquadData.pnl_total,
      volume: isDay ? mySquadData.volume_1d : mySquadData.volume_total,
      rank: mySquadIndex + 1,
    };
  }, [mySquad, leaderboardData, isDay]);

  const handleSquadClick = (squadId: string) => {
    navigate(`/squad/${squadId}`);
  };

  return (
    <div className="squad-leaderboard">
      <div
        className={`squad-leaderboard__skeleton-layer${
          isLoading ? ' squad-leaderboard__skeleton-layer--visible' : ''
        }`}
        aria-hidden={!isLoading}
      >
        <SquadLeaderboardSkeleton />
      </div>

      <div
        className={`squad-leaderboard__content${
          !isLoading ? ' squad-leaderboard__content--visible' : ''
        }`}
        aria-busy={isLoading}
      >
        {!isLoading && (
          <>
            {mySquad && mySquadInfo !== null && (
              <>
                <div className="leaderboard-title">{'<My_Squad_Rankings>'}</div>
                <ButtonDiv
                  className="squad-leaderboard-content"
                  onClick={() => handleSquadClick(mySquad.squadId)}
                >
                  <img
                    className="squad-avatar"
                    src={mySquad.avatarUrl ? mySquad.avatarUrl : Media.favicon}
                    alt={'squad'}
                    style={{ boxShadow: `0 0 2px 2px ${mySquad.color}` }}
                  />
                  <div className="info-section">
                    <div className="squad-name">
                      <span className="squad-name__text">{`> ${mySquad.name}`}</span>
                    </div>
                    <div className="squad-info">
                      <div className="info-title">{`${leaderboardType}_Volume:`}</div>
                      <div className="info-content volume">
                        {`${StringHelper.formatCompactNumber(
                          mySquadInfo.volume,
                        )}`}
                      </div>
                    </div>
                    <div className="squad-info">
                      <div className="info-title">{`${leaderboardType}_PnL:`}</div>
                      <div
                        className={`info-content ${
                          mySquadInfo.pnl < 0 ? 'negative' : ''
                        }`}
                      >
                        {`${StringHelper.formatCompactNumber(mySquadInfo.pnl)}`}
                      </div>
                    </div>
                  </div>
                  <div className="rank-tag">{`#0${mySquadInfo.rank}`}</div>
                </ButtonDiv>
              </>
            )}
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
                        item.squad.avatar_url
                          ? item.squad.avatar_url
                          : Media.favicon
                      }
                      alt={'squad'}
                      style={{
                        boxShadow: `0 0 2px 2px ${item.squad.color}`,
                      }}
                    />
                    <div className="info-section">
                      <div className="squad-name">
                        <span className="squad-name__text">{`> ${item.squad.name}`}</span>
                      </div>
                      <div className="squad-info">
                        <div className="info-title">{`${leaderboardType}_Volume:`}</div>
                        <div className="info-content volume">
                          {`${StringHelper.formatCompactNumber(volume)}`}
                        </div>
                      </div>
                      <div className="squad-info">
                        <div className="info-title">{`${leaderboardType}_PnL:`}</div>
                        <div
                          className={`info-content ${
                            pnl < 0 ? 'negative' : ''
                          }`}
                        >
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
            <NavLink
              to={'/squad'}
              target={'_self'}
              className="view-squad-button"
            >
              {'<All_Squads>'}
            </NavLink>
          </>
        )}
      </div>
    </div>
  );
};

export default SquadLeaderboard;
