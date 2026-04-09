import { useEffect, useMemo, useState } from 'react';

import SquadLeaderboard from '@/components/SquadLeaderboard/SquadLeaderboard';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import ApiService from '@/utils/api/ApiService';
import StringHelper from '@/utils/helpers/StringHelper';
import useWindowSize from '@/utils/hooks/useWindowSize';
import { SquadLeaderboardResponseType } from '@/utils/api/instances/squad/service';

import './Home.scss';
import Bitmap from '@/components/Bitmap/Bitmap';

const Home = () => {
  const { isWindowSmall } = useWindowSize();

  const [leaderboardType, setLeaderboardType] = useState<'24h' | 'total'>(
    '24h',
  );
  const [leaderboardData, setLeaderboardData] =
    useState<SquadLeaderboardResponseType | null>(null);

  const fetchDayLeaderboard = () => {
    ApiService.squad.get24hrLeaderboard().then(setLeaderboardData);
  };

  const fetchTotalLeaderboard = () => {
    ApiService.squad.getTotalLeaderboard().then(setLeaderboardData);
  };

  const switchTimeframe = () => {
    setLeaderboardType(leaderboardType === '24h' ? 'total' : '24h');
  };

  const volume = useMemo(() => {
    if (!leaderboardData) return 0;
    if (leaderboardType === '24h') {
      return leaderboardData.items.reduce(
        (acc, item) => acc + item.volume_1d,
        0,
      );
    }
    return leaderboardData.items.reduce(
      (acc, item) => acc + item.volume_total,
      0,
    );
  }, [leaderboardType, leaderboardData]);

  useEffect(() => {
    if (leaderboardType === '24h') {
      fetchDayLeaderboard();
    } else {
      fetchTotalLeaderboard();
    }
  }, [leaderboardType]);

  return (
    <div className="home">
      <div className="left-section">
        <div className="bitmap-title">
          <div className="bitmap-title-text">{'Squad_Bitmap'}</div>
          <ButtonDiv className="switch-button" onClick={switchTimeframe}>
            <div>{isWindowSmall ? '<Time>' : '<Switch_Time>'}</div>
            <div className="tag">{leaderboardType}</div>
          </ButtonDiv>
        </div>

        <Bitmap
          leaderboardType={leaderboardType}
          leaderboardData={leaderboardData}
          useTestTemplate={process.env.NEXT_PUBLIC_BITMAP_TEST === 'true'}
        />

        <div className="squad-data-section">
          <div className="data-container">
            <div className="data-title">{'Total_Squads'}</div>
            <div className="data-content">
              {leaderboardData?.items.length ?? '-'}
            </div>
          </div>
          <div className="data-container">
            <div className="data-title">{`${leaderboardType}_Volume`}</div>
            <div className="data-content volume">
              {StringHelper.formatCompactNumber(volume)}
            </div>
          </div>
        </div>
      </div>

      <div className="right-section">
        <SquadLeaderboard
          leaderboardType={leaderboardType}
          leaderboardData={leaderboardData}
        />
      </div>
    </div>
  );
};

export default Home;
