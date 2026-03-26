import { NavLink } from 'react-router-dom';

import ConnectWalletModule from '@/components/ConnectWalletModule/ConnectWalletModule';
import SideMenuIcon from '@/components/SideMenuIcon/SideMenuIcon';

import useWindowSize from '@/utils/hooks/useWindowSize';

import './Header.scss';

const Header = () => {
  const { isWindowSmall } = useWindowSize();

  return (
    <div className="header">
      {isWindowSmall && <SideMenuIcon />}
      <NavLink to={'/'} className="logo">
        {'_Phalanx'}
      </NavLink>
      <div className="menu-list">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive ? 'menu-item active' : 'menu-item'
          }
        >
          {'Home'}
        </NavLink>
        <NavLink
          to="/squad"
          className={({ isActive }) =>
            isActive ? 'menu-item active' : 'menu-item'
          }
        >
          {'Squad'}
        </NavLink>
        <NavLink
          to="/trade"
          className={({ isActive }) =>
            isActive ? 'menu-item active' : 'menu-item'
          }
        >
          {'Trade'}
        </NavLink>
      </div>
      <ConnectWalletModule />
    </div>
  );
};

export default Header;
