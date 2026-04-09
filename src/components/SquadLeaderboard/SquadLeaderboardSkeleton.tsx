import './SquadLeaderboardSkeleton.scss';

const ROW_COUNT = 3;

const SquadLeaderboardSkeleton = () => {
  return (
    <div className="squad-leaderboard-skeleton" aria-hidden aria-busy="true">
      <div className="squad-leaderboard-skeleton__title squad-leaderboard-skeleton__shimmer" />
      <div className="squad-leaderboard-skeleton__list">
        {Array.from({ length: ROW_COUNT }, (_, i) => (
          <div key={i} className="squad-leaderboard-skeleton__row">
            <div className="squad-leaderboard-skeleton__avatar squad-leaderboard-skeleton__shimmer" />
            <div className="squad-leaderboard-skeleton__info">
              <div className="squad-leaderboard-skeleton__line squad-leaderboard-skeleton__line--name squad-leaderboard-skeleton__shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SquadLeaderboardSkeleton;
