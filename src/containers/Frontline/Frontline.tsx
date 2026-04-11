import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import SeasonSelector from '@/components/SeasonSelector/SeasonSelector';

import ApiService from '@/utils/api/ApiService';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import { SquadType } from '@/utils/constants/Types';
import { useUser } from '@/utils/contexts/UserContext';
import type {
  FrontlineListItem,
  FrontlineRankingsItem,
  FrontlineRankingsResponse,
  FrontlineSquadRankingResponse,
} from '@/utils/api/instances/frontline/service';

import './Frontline.scss';

const LEADERBOARD_PAGE_SIZE = 10;

const displayRewardValue = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return StringHelper.formatCompactNumber(value);
  }
  return StringHelper.formatRewardValue(value);
};

function FrontlineRewardDetails({
  seasonName,
  reward,
  mySquad,
  mySquadRanking,
  isLoadingMySquadRank,
  onMySquadNavigate,
}: {
  seasonName: string;
  reward: unknown;
  mySquad: SquadType | null;
  mySquadRanking: FrontlineSquadRankingResponse | null;
  isLoadingMySquadRank: boolean;
  onMySquadNavigate: () => void;
}) {
  const rewardEntries =
    typeof reward === 'object' && reward !== null && !Array.isArray(reward)
      ? Object.entries(reward as Record<string, unknown>)
      : [];
  const hasRewardGrid = rewardEntries.length > 0;
  const hasRewardSolo =
    reward !== null &&
    reward !== undefined &&
    (typeof reward !== 'object' || Array.isArray(reward));
  const hasRewardContent = hasRewardGrid || hasRewardSolo;
  const hasMySquadSection =
    !!mySquad && (isLoadingMySquadRank || !!mySquadRanking);

  if (!hasRewardContent && !hasMySquadSection) {
    return null;
  }

  const showSoloCard = hasRewardSolo && !hasRewardGrid;

  return (
    <div
      className={`frontline-reward-showcase${
        showSoloCard ? ' frontline-reward-showcase--solo' : ''
      }`}
    >
      <div className="frontline-reward-showcase__glow" aria-hidden />
      <div className="frontline-reward-showcase__corners" aria-hidden />
      <header className="frontline-reward-showcase__header">
        <span className="frontline-reward-showcase__tag">
          {`<${seasonName}_Loot_Drop>`}
        </span>
        <h2 className="frontline-reward-showcase__title">{'THE_SPOILS'}</h2>
        {hasRewardContent && (
          <p className="frontline-reward-showcase__sub">
            {'Claim_your_share_when_the_operation_closes.'}
          </p>
        )}
      </header>

      {hasRewardGrid && (
        <div className="frontline-reward-showcase__grid">
          {rewardEntries.map(([key, value]) => (
            <div key={key} className="frontline-reward-card">
              <div className="frontline-reward-card__edge" aria-hidden />
              <div className="frontline-reward-card__key">{key}</div>
              <div className="frontline-reward-card__value">
                {displayRewardValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSoloCard && reward !== undefined && reward !== null && (
        <div className="frontline-reward-card frontline-reward-card--solo">
          <div className="frontline-reward-card__edge" aria-hidden />
          <div className="frontline-reward-card__value frontline-reward-card__value--hero">
            {displayRewardValue(reward)}
          </div>
        </div>
      )}

      {hasMySquadSection && mySquad && (
        <div className="frontline-reward-showcase__my-squad">
          <div className="frontline-reward-showcase__my-squad-label">
            {'<My_Squad_Rankings>'}
          </div>
          {isLoadingMySquadRank && (
            <div className="frontline-reward-showcase__my-squad-loading">
              {'> Loading_your_squad_rank...'}
            </div>
          )}
          {!isLoadingMySquadRank && mySquadRanking && (
            <FrontlineMySquadSummary
              embedded
              mySquad={mySquad}
              ranking={mySquadRanking}
              onNavigate={onMySquadNavigate}
            />
          )}
        </div>
      )}
    </div>
  );
}

const FirepowerColumn = ({
  items,
  onSquadClick,
  mySquadId,
  visibleCount,
  onLoadMore,
}: {
  items: FrontlineRankingsItem[];
  onSquadClick: (id: string) => void;
  mySquadId: string | null;
  visibleCount: number;
  onLoadMore: () => void;
}) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.volume_rank - b.volume_rank),
    [items],
  );

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  const hasMore = sorted.length > visibleCount;

  return (
    <div className="frontline-column">
      <div className="frontline-column__title">{'Firepower'}</div>
      <div className="frontline-column__subtitle">{'Volume_Leaderboard'}</div>
      <div className="frontline-column__list">
        {visible.map((item) => (
          <ButtonDiv
            key={item.squad.id}
            className="frontline-row"
            onClick={() => onSquadClick(item.squad.id)}
          >
            <span className="frontline-row__rank">#{item.volume_rank}</span>
            <img
              className="frontline-row__avatar"
              src={
                item.squad.avatar_url ? item.squad.avatar_url : Media.favicon
              }
              alt=""
              style={{ boxShadow: `0 0 2px 2px ${item.squad.color}` }}
            />
            <div className="frontline-row__name">{`> ${item.squad.name}`}</div>
            <div className="frontline-row__metric volume">
              {StringHelper.formatCompactNumber(item.volume)}
            </div>
            {mySquadId === item.squad.id && (
              <div className="my-squad-tag">{'My_Squad'}</div>
            )}
          </ButtonDiv>
        ))}
      </div>
      {hasMore && (
        <ButtonDiv className="frontline-column__load-more" onClick={onLoadMore}>
          {'<View_More>'}
        </ButtonDiv>
      )}
    </div>
  );
};

const WarChestColumn = ({
  items,
  onSquadClick,
  mySquadId,
  visibleCount,
  onLoadMore,
}: {
  items: FrontlineRankingsItem[];
  onSquadClick: (id: string) => void;
  mySquadId: string | null;
  visibleCount: number;
  onLoadMore: () => void;
}) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.pnl_rank - b.pnl_rank),
    [items],
  );

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  const hasMore = sorted.length > visibleCount;

  return (
    <div className="frontline-column">
      <div className="frontline-column__title">{'The_War_Chest'}</div>
      <div className="frontline-column__subtitle">{'PnL_Leaderboard'}</div>
      <div className="frontline-column__list">
        {visible.map((item) => (
          <ButtonDiv
            key={item.squad.id}
            className="frontline-row"
            onClick={() => onSquadClick(item.squad.id)}
          >
            <span className="frontline-row__rank">#{item.pnl_rank}</span>
            <img
              className="frontline-row__avatar"
              src={
                item.squad.avatar_url ? item.squad.avatar_url : Media.favicon
              }
              alt=""
              style={{ boxShadow: `0 0 2px 2px ${item.squad.color}` }}
            />
            <div className="frontline-row__name">{`> ${item.squad.name}`}</div>
            <div
              className={`frontline-row__metric${
                item.pnl < 0 ? ' negative' : ''
              }`}
            >
              {StringHelper.formatCompactNumber(item.pnl)}
            </div>
            {mySquadId === item.squad.id && (
              <div className="my-squad-tag">{'My_Squad'}</div>
            )}
          </ButtonDiv>
        ))}
      </div>
      {hasMore && (
        <ButtonDiv className="frontline-column__load-more" onClick={onLoadMore}>
          {'<View_More>'}
        </ButtonDiv>
      )}
    </div>
  );
};

function FrontlineMySquadSummary({
  mySquad,
  ranking,
  onNavigate,
  embedded = false,
}: {
  mySquad: SquadType;
  ranking: FrontlineSquadRankingResponse;
  onNavigate: () => void;
  embedded?: boolean;
}) {
  return (
    <div
      className={`frontline-my-squad${
        embedded ? ' frontline-my-squad--embedded' : ''
      }`}
    >
      {!embedded && (
        <div className="frontline-my-squad__title">{'<My_Squad_Rankings>'}</div>
      )}
      <ButtonDiv
        className="frontline-reward-card frontline-reward-card--my-squad"
        onClick={onNavigate}
      >
        <div className="frontline-reward-card__edge" aria-hidden />
        <div className="frontline-reward-card__my-squad-head">
          <img
            className="frontline-reward-card__my-squad-avatar"
            src={mySquad.avatarUrl ? mySquad.avatarUrl : Media.favicon}
            alt=""
            style={{ boxShadow: `0 0 2px 2px ${mySquad.color}` }}
          />
          <div className="frontline-reward-card__my-squad-name">
            {`> ${mySquad.name}`}
          </div>
        </div>
        <div className="frontline-reward-card__my-squad-stats">
          <div className="frontline-reward-card__my-squad-stat">
            <div className="frontline-reward-card__key">{'Firepower'}</div>
            <div className="frontline-reward-card__value">
              #{ranking.volume_rank}
            </div>
            <div className="frontline-reward-card__my-squad-sub">
              {`${StringHelper.formatCompactNumber(ranking.volume)} USD`}
            </div>
          </div>
          <div className="frontline-reward-card__my-squad-stat">
            <div className="frontline-reward-card__key">{'War_Chest'}</div>
            <div className="frontline-reward-card__value">
              #{ranking.pnl_rank}
            </div>
            <div
              className={`frontline-reward-card__my-squad-sub${
                ranking.pnl < 0
                  ? ' frontline-reward-card__my-squad-sub--negative'
                  : ''
              }`}
            >
              {`${StringHelper.formatCompactNumber(ranking.pnl)} USD`}
            </div>
          </div>
        </div>
      </ButtonDiv>
    </div>
  );
}

const Frontline = () => {
  const navigate = useNavigate();
  const { mySquad } = useUser();
  const [seasons, setSeasons] = useState<FrontlineListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<FrontlineRankingsResponse | null>(
    null,
  );
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [mySquadRanking, setMySquadRanking] =
    useState<FrontlineSquadRankingResponse | null>(null);
  const [isLoadingMySquadRank, setIsLoadingMySquadRank] = useState(false);
  const [leaderboardFirepowerVisible, setLeaderboardFirepowerVisible] =
    useState(LEADERBOARD_PAGE_SIZE);
  const [leaderboardWarChestVisible, setLeaderboardWarChestVisible] = useState(
    LEADERBOARD_PAGE_SIZE,
  );

  const loadList = useCallback(async () => {
    setIsLoadingList(true);
    setListError(null);
    try {
      const { items } = await ApiService.frontline.getList();
      setSeasons(items);
      const current = items.find((s) => s.status === 'current');
      setSelectedId((prev) => {
        if (prev && items.some((i) => i.id === prev)) return prev;
        if (current) return current.id;
        return items[0]?.id ?? null;
      });
    } catch {
      setListError('Failed to load frontline seasons.');
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setRankings(null);
      return;
    }
    let cancelled = false;
    setIsLoadingRankings(true);
    ApiService.frontline
      .getRankings(selectedId)
      .then((data) => {
        if (!cancelled) setRankings(data);
      })
      .catch(() => {
        if (!cancelled) setRankings(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRankings(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !mySquad?.squadId) {
      setMySquadRanking(null);
      setIsLoadingMySquadRank(false);
      return;
    }
    let cancelled = false;
    setIsLoadingMySquadRank(true);
    ApiService.frontline
      .getSquadRanking(selectedId, mySquad.squadId)
      .then((data) => {
        if (!cancelled) setMySquadRanking(data);
      })
      .catch(() => {
        if (!cancelled) setMySquadRanking(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMySquadRank(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, mySquad?.squadId]);

  useEffect(() => {
    setLeaderboardFirepowerVisible(LEADERBOARD_PAGE_SIZE);
    setLeaderboardWarChestVisible(LEADERBOARD_PAGE_SIZE);
  }, [selectedId, rankings]);

  const handleLoadMoreFirepower = useCallback(() => {
    setLeaderboardFirepowerVisible((n) => n + LEADERBOARD_PAGE_SIZE);
  }, []);

  const handleLoadMoreWarChest = useCallback(() => {
    setLeaderboardWarChestVisible((n) => n + LEADERBOARD_PAGE_SIZE);
  }, []);

  const handleSquadClick = (squadId: string) => {
    navigate(`/squad/${squadId}`);
  };

  const selectedSeason = seasons.find((s) => s.id === selectedId);

  const rewardForMeta =
    rankings?.frontline?.reward ?? selectedSeason?.reward ?? null;

  return (
    <div className="frontline">
      <div className="frontline-header">
        <div className="frontline-title">{'Frontline'}</div>
        {!isLoadingList && seasons.length > 0 && (
          <SeasonSelector
            seasons={seasons}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        )}
      </div>

      <div className="frontline-body">
        {isLoadingList && (
          <div
            className="frontline__loading-layer"
            aria-live="polite"
            aria-busy={true}
          >
            <div className="frontline-loading-message">
              {'> Loading_Frontline...'}
            </div>
          </div>
        )}

        {listError && (
          <div className="frontline-message frontline-message--error">
            {listError}
          </div>
        )}

        {!isLoadingList && seasons.length === 0 && (
          <div className="frontline-message">{'No_frontline_seasons_yet.'}</div>
        )}

        {selectedSeason && !isLoadingList && (
          <div className="frontline__content" key={selectedId}>
            <div className="frontline-meta">
              <div className="frontline-meta__operation">
                <span className="frontline-meta__operation-label">
                  {'Operation_window'}
                </span>
                <span className="frontline-meta__operation-dates">
                  {new Date(selectedSeason.starts_at).toLocaleDateString()} —{' '}
                  {new Date(selectedSeason.ends_at).toLocaleDateString()}
                </span>
                {selectedSeason.status === 'current' && (
                  <span className="frontline-meta__live">{'Live'}</span>
                )}
              </div>
              <FrontlineRewardDetails
                seasonName={selectedSeason.name}
                reward={rewardForMeta}
                mySquad={mySquad}
                mySquadRanking={mySquadRanking}
                isLoadingMySquadRank={isLoadingMySquadRank}
                onMySquadNavigate={() => {
                  if (mySquad) navigate(`/squad/${mySquad.squadId}`);
                }}
              />
            </div>

            {isLoadingRankings && (
              <div className="frontline-boards-loading">
                {'> Loading_leaderboards...'}
              </div>
            )}

            {rankings && !isLoadingRankings && (
              <>
                <div className="frontline-boards frontline-boards--visible">
                  <FirepowerColumn
                    items={rankings.items}
                    onSquadClick={handleSquadClick}
                    mySquadId={mySquad?.squadId ?? null}
                    visibleCount={leaderboardFirepowerVisible}
                    onLoadMore={handleLoadMoreFirepower}
                  />
                  <WarChestColumn
                    items={rankings.items}
                    onSquadClick={handleSquadClick}
                    mySquadId={mySquad?.squadId ?? null}
                    visibleCount={leaderboardWarChestVisible}
                    onLoadMore={handleLoadMoreWarChest}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Frontline;
