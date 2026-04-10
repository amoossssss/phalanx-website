import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';

import SeasonDropdown from '@/components/SeasonDropdown/SeasonDropdown';

import useClickOutside from '@/utils/hooks/useClickOutside';
import type { FrontlineListItem } from '@/utils/api/instances/frontline/service';

import './SeasonSelector.scss';

type SeasonSelectorProps = {
  seasons: FrontlineListItem[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
};

const SeasonSelector = ({
  seasons,
  selectedId,
  setSelectedId,
}: SeasonSelectorProps) => {
  const {
    ref,
    isOpen: isDropdownOpen,
    setIsOpen: setDropdownOpen,
  } = useClickOutside();

  const selected = seasons.find((s) => s.id === selectedId);

  const handleOpenDropdown = () => {
    if (seasons.length < 2) return;
    setDropdownOpen(true);
  };

  if (!selectedId || !selected) return null;

  return (
    <div className="season-selector">
      <ButtonDiv
        className="season-selector-control"
        onClick={handleOpenDropdown}
      >
        <div className="season-title">{'> Operation: '}</div>
        <div className="season-name">{`${selected.name}`}</div>
        {isDropdownOpen && (
          <SeasonDropdown
            seasons={seasons}
            close={() => {
              setDropdownOpen(false);
            }}
            select={(id) => {
              setSelectedId(id);
              setDropdownOpen(false);
            }}
            divRef={ref}
          />
        )}
      </ButtonDiv>
    </div>
  );
};

export default SeasonSelector;
