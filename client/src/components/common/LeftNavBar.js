import React from 'react';
import { Nav } from 'react-bootstrap';

function LeftNavBar({ isAdmin }) {
  const leftNavBarStyle = {
    backgroundColor: '#2A85E2',
    width: '10%',
    top: '56px',
    left: 0,
    paddingTop: '20px',
    color: 'white',
  };

  const navItemStyle = {
    padding: '10px 20px',
    color: 'white'
  };

  return (
    <div style={leftNavBarStyle}>
      <Nav className="flex-column">
        <Nav.Link href="/" style={navItemStyle}>Home</Nav.Link>
        {isAdmin && <Nav.Link href="/users" style={navItemStyle}>User Info</Nav.Link>}
        <Nav.Link href="/mypage" style={navItemStyle}>My Page</Nav.Link>
      </Nav>
    </div>
  );
}

export default LeftNavBar;
