import { NavLink } from 'react-router-dom';

import ButtonDiv from '@/lib/ButtonDiv/ButtonDiv';
import withColoredSvg from '@/lib/ColoredSvg/ColoredSvg';

import Media from '@/utils/constants/Media';

import './SideMenu.scss';

const CloseIcon = withColoredSvg(Media.icons.closeIcon);
// const TwitterIcon = withColoredSvg(Media.icons.twitterIcon);

type SideMenuType = {
  isOpen: boolean;
  closeMenu: () => void;
};

const SideMenu = ({ isOpen, closeMenu }: SideMenuType) => {
  return (
    <div className={`side-menu ${isOpen ? 'open' : 'closed'}`}>
      <div className="top-section">
        <div className="logo-block">
          <NavLink
            to="/"
            target="_self"
            className="logo-link"
            onClick={closeMenu}
          >
            {'_Phalanx'}
          </NavLink>
          <ButtonDiv onClick={closeMenu}>
            <CloseIcon color={'#ff51fa'} size={20} />
          </ButtonDiv>
        </div>

        <div className="menu-list-block">
          <NavLink
            to={'/'}
            target={'_self'}
            className={({ isActive }) =>
              isActive ? 'menu-link active' : 'menu-link'
            }
            onClick={closeMenu}
          >
            {'Home'}
          </NavLink>

          <NavLink
            to={'/squad'}
            target={'_self'}
            className={({ isActive }) =>
              isActive ? 'menu-link active' : 'menu-link'
            }
            onClick={closeMenu}
          >
            {'Squad'}
          </NavLink>

          <NavLink
            to={'/trade'}
            target={'_self'}
            className={({ isActive }) =>
              isActive ? 'menu-link active' : 'menu-link'
            }
            onClick={closeMenu}
          >
            {'Trade'}
          </NavLink>

          {/*<Link to={'https://x.com/'} target={'_blank'}>*/}
          {/*  <TwitterIcon color={'#8ff5ff'} size={24} />*/}
          {/*</Link>*/}
        </div>
      </div>
    </div>
  );
};

export default SideMenu;
