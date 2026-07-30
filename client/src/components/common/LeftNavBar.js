import React from 'react';
import { NavLink } from 'react-router-dom';
import { BsHouseDoor, BsPeople, BsPersonCircle } from 'react-icons/bs';

function LeftNavBar({ isAdmin }) {
  const navItems = [
    { to: '/main', label: 'Home', icon: <BsHouseDoor size={18} /> },
    ...(isAdmin ? [{ to: '/users', label: 'User Info', icon: <BsPeople size={18} /> }] : []),
    { to: '/mypage', label: 'My Page', icon: <BsPersonCircle size={18} /> },
  ];

  return (
    <div className="left-navbar">
      <nav className="left-navbar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `left-nav-link${isActive ? ' active' : ''}`}
          >
            <span className="left-nav-icon">{item.icon}</span>
            <span className="left-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default LeftNavBar;
