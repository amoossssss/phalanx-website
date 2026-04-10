import { RefObject } from 'react';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import type { FrontlineListItem } from '@/utils/api/instances/frontline/service';

import './SeasonDropdown.scss';

type SeasonDropdownProps = {
  seasons: FrontlineListItem[];
  close: () => void;
  select: (id: string) => void;
  divRef: RefObject<HTMLDivElement>;
};

const SeasonDropdown = ({
  seasons,
  close,
  select,
  divRef,
}: SeasonDropdownProps) => {
  return (
    <div className="season-dropdown" ref={divRef}>
      <div className="season-dropdown-list" role="menu">
        {seasons.length === 0 ? (
          <div className="loading">{'> Loading...'}</div>
        ) : (
          seasons.map((s) => (
            <ButtonDiv
              key={s.id}
              className="season-dropdown-row"
              onClick={(event) => {
                event.stopPropagation();
                select(s.id);
                close();
              }}
            >
              <div className="season-dropdown-name">{`${s.name}`}</div>
            </ButtonDiv>
          ))
        )}
      </div>
    </div>
  );
};

export default SeasonDropdown;
