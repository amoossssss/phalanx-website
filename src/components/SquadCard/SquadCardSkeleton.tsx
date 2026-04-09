import './SquadCardSkeleton.scss';

const SquadCardSkeleton = () => {
  return (
    <div className="squad-card-skeleton" aria-hidden>
      <div className="squad-card-skeleton__avatar-row">
        <div className="squad-card-skeleton__avatar squad-card-skeleton__shimmer" />
        <div className="squad-card-skeleton__leader">
          <div className="squad-card-skeleton__line squad-card-skeleton__line--sm squad-card-skeleton__shimmer" />
          <div className="squad-card-skeleton__line squad-card-skeleton__line--md squad-card-skeleton__shimmer" />
        </div>
      </div>

      <div className="squad-card-skeleton__name-block">
        <div className="squad-card-skeleton__line squad-card-skeleton__line--lg squad-card-skeleton__shimmer" />
        <div className="squad-card-skeleton__line squad-card-skeleton__line--sm squad-card-skeleton__shimmer" />
      </div>

      <div className="squad-card-skeleton__earnings">
        <div className="squad-card-skeleton__earnings-col">
          <div className="squad-card-skeleton__line squad-card-skeleton__line--xs squad-card-skeleton__shimmer" />
          <div className="squad-card-skeleton__line squad-card-skeleton__line--num squad-card-skeleton__shimmer" />
        </div>
        <div className="squad-card-skeleton__earnings-col">
          <div className="squad-card-skeleton__line squad-card-skeleton__line--xs squad-card-skeleton__shimmer" />
          <div className="squad-card-skeleton__line squad-card-skeleton__line--num squad-card-skeleton__shimmer" />
        </div>
      </div>

      <div className="squad-card-skeleton__button squad-card-skeleton__shimmer" />
    </div>
  );
};

export default SquadCardSkeleton;
