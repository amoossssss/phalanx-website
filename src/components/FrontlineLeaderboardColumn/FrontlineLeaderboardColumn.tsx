import { useMemo } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import Media from '@/utils/constants/Media';
import StringHelper from '@/utils/helpers/StringHelper';
import type { FrontlineRankingsItem } from '@/utils/api/instances/frontline/service';

export type FrontlineLeaderboardColumnVariant = 'firepower' | 'warChest';

const VARIANT_CONFIG: Record<
  FrontlineLeaderboardColumnVariant,
  {
    title: string;
    subtitle: string;
    sort: (a: FrontlineRankingsItem, b: FrontlineRankingsItem) => number;
    rankOf: (item: FrontlineRankingsItem) => number;
    metricClassName: (item: FrontlineRankingsItem) => string;
    formatMetric: (item: FrontlineRankingsItem) => string;
  }
> = {
  firepower: {
    title: 'Firepower',
    subtitle: 'Volume_Leaderboard',
    sort: (a, b) => a.volume_rank - b.volume_rank,
    rankOf: (item) => item.volume_rank,
    metricClassName: () => 'frontline-row__metric volume',
    formatMetric: (item) => StringHelper.formatCompactNumber(item.volume),
  },
  warChest: {
    title: 'The_War_Chest',
    subtitle: 'PnL_Leaderboard',
    sort: (a, b) => a.pnl_rank - b.pnl_rank,
    rankOf: (item) => item.pnl_rank,
    metricClassName: (item) =>
      `frontline-row__metric${item.pnl < 0 ? ' negative' : ''}`,
    formatMetric: (item) => StringHelper.formatCompactNumber(item.pnl),
  },
};

export type FrontlineLeaderboardColumnProps = {
  variant: FrontlineLeaderboardColumnVariant;
  items: FrontlineRankingsItem[];
  onSquadClick: (id: string) => void;
  mySquadId: string | null;
  visibleCount: number;
  onLoadMore: () => void;
};

const FrontlineLeaderboardColumn = ({
  variant,
  items,
  onSquadClick,
  mySquadId,
  visibleCount,
  onLoadMore,
}: FrontlineLeaderboardColumnProps) => {
  const cfg = VARIANT_CONFIG[variant];

  const sorted = useMemo(() => {
    const sort = VARIANT_CONFIG[variant].sort;
    return [...items].sort(sort);
  }, [items, variant]);

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );

  const hasMore = sorted.length > visibleCount;

  return (
    <div className="frontline-column">
      <div className="frontline-column__title">{cfg.title}</div>
      <div className="frontline-column__subtitle">{cfg.subtitle}</div>
      <div className="frontline-column__list">
        {visible.map((item) => (
          <ButtonDiv
            key={item.squad.id}
            className="frontline-row"
            onClick={() => onSquadClick(item.squad.id)}
          >
            <span className="frontline-row__rank">#{cfg.rankOf(item)}</span>
            <img
              className="frontline-row__avatar"
              src={
                item.squad.avatar_url ? item.squad.avatar_url : Media.favicon
              }
              alt=""
              style={{ boxShadow: `0 0 2px 2px ${item.squad.color}` }}
            />
            <div className="frontline-row__name">{`> ${item.squad.name}`}</div>
            <div className={cfg.metricClassName(item)}>
              {cfg.formatMetric(item)}
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

export default FrontlineLeaderboardColumn;
