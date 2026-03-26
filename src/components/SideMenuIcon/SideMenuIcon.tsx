import { useState } from 'react';

import SideMenu from '@/components/SideMenu/SideMenu';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';

const MenuIcon = withColoredSvg(Media.icons.menuIcon);

const SideMenuIcon = ({ className }: { className?: string }) => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const handleOpenMenu = () => {
    setIsSideMenuOpen(true);
  };

  return (
    <div>
      <ButtonDiv onClick={handleOpenMenu}>
        <MenuIcon color={'rgba(143,245,255)'} size={20} className={className} />
      </ButtonDiv>
      <SideMenu
        isOpen={isSideMenuOpen}
        closeMenu={() => setIsSideMenuOpen(false)}
      />
    </div>
  );
};

export default SideMenuIcon;
