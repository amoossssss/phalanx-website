import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import SeasonSelector from '@/components/SeasonSelector/SeasonSelector';

import ApiService from '@/utils/api/ApiService';
import type {
  FrontlineListItem,
  FrontlineRankingsItem,
  FrontlineRankingsResponse,
} from '@/utils/api/instances/frontline/service';
import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';

import './Frontline.scss';

const displayRewardValue = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return StringHelper.formatCompactNumber(value);
  }
  return StringHelper.formatRewardValue(value);
};

function FrontlineRewardDetails({
  seasonName,
  reward,
}: {
  seasonName: string;
  reward: unknown;
}) {
  if (reward === null || reward === undefined) {
    return null;
  }

  if (typeof reward === 'object' && !Array.isArray(reward)) {
    const entries = Object.entries(reward as Record<string, unknown>);
    if (entries.length === 0) {
      return null;
    }
    return (
      <div className="frontline-reward-showcase">
        <div className="frontline-reward-showcase__glow" aria-hidden />
        <div className="frontline-reward-showcase__corners" aria-hidden />
        <header className="frontline-reward-showcase__header">
          <span className="frontline-reward-showcase__tag">
            {`<${seasonName}_Loot_Drop>`}
          </span>
          <h2 className="frontline-reward-showcase__title">{'THE_SPOILS'}</h2>
          <p className="frontline-reward-showcase__sub">
            {'Claim_your_share_when_the_operation_closes.'}
          </p>
        </header>
        <div className="frontline-reward-showcase__grid">
          {entries.map(([key, value]) => (
            <div key={key} className="frontline-reward-card">
              <div className="frontline-reward-card__edge" aria-hidden />
              <div className="frontline-reward-card__key">{key}</div>
              <div className="frontline-reward-card__value">
                {displayRewardValue(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="frontline-reward-showcase frontline-reward-showcase--solo">
      <div className="frontline-reward-showcase__glow" aria-hidden />
      <div className="frontline-reward-showcase__corners" aria-hidden />
      <header className="frontline-reward-showcase__header">
        <span className="frontline-reward-showcase__tag">{'<Loot_Drop>'}</span>
        <h2 className="frontline-reward-showcase__title">{'THE_SPOILS'}</h2>
      </header>
      <div className="frontline-reward-card frontline-reward-card--solo">
        <div className="frontline-reward-card__edge" aria-hidden />
        <div className="frontline-reward-card__value frontline-reward-card__value--hero">
          {displayRewardValue(reward)}
        </div>
      </div>
    </div>
  );
}

const FirepowerColumn = ({
  items,
  onSquadClick,
}: {
  items: FrontlineRankingsItem[];
  onSquadClick: (id: string) => void;
}) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.volume_rank - b.volume_rank),
    [items],
  );

  return (
    <div className="frontline-column">
      <div className="frontline-column__title">{'Firepower'}</div>
      <div className="frontline-column__subtitle">{'Volume_Leaderboard'}</div>
      <div className="frontline-column__list">
        {sorted.map((item) => (
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
          </ButtonDiv>
        ))}
      </div>
    </div>
  );
};

const WarChestColumn = ({
  items,
  onSquadClick,
}: {
  items: FrontlineRankingsItem[];
  onSquadClick: (id: string) => void;
}) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.pnl_rank - b.pnl_rank),
    [items],
  );

  return (
    <div className="frontline-column">
      <div className="frontline-column__title">{'The_War_Chest'}</div>
      <div className="frontline-column__subtitle">{'PnL_Leaderboard'}</div>
      <div className="frontline-column__list">
        {sorted.map((item) => (
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
          </ButtonDiv>
        ))}
      </div>
    </div>
  );
};

const Frontline = () => {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<FrontlineListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rankings, setRankings] = useState<FrontlineRankingsResponse | null>(
    null,
  );
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

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

      {selectedSeason && (
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
          />
        </div>
      )}

      {listError && <div className="frontline-message">{listError}</div>}

      {!isLoadingList && seasons.length === 0 && (
        <div className="frontline-message">{'No_frontline_seasons_yet.'}</div>
      )}

      {(isLoadingList || isLoadingRankings) && (
        <div className="frontline-message">{'Loading…'}</div>
      )}

      {!isLoadingRankings && rankings && (
        <div className="frontline-boards">
          <FirepowerColumn
            items={rankings.items}
            onSquadClick={handleSquadClick}
          />
          <WarChestColumn
            items={rankings.items}
            onSquadClick={handleSquadClick}
          />
        </div>
      )}
    </div>
  );
};

export default Frontline;
