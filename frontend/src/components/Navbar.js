import React from 'react';
import styled from '@emotion/styled';

const Nav = styled.nav`
  background-color: #333;
  color: white;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const NavLinks = styled.div`
  display: flex;
  align-items: center;
`;

const NavLink = styled.a`
  color: white;
  text-decoration: none;
  padding: 0 15px;
  font-size: 1rem;
  height: 60px;
  display: flex;
  align-items: center;
  border-bottom: 2px solid transparent;

  &:hover {
    background-color: #555;
    border-bottom: 2px solid #00aaff;
  }

  &.active {
    background-color: #444;
    border-bottom: 2px solid #00aaff;
  }
`;

const Logo = styled.div`
  font-weight: bold;
  font-size: 1.5rem;
  padding-right: 20px;
`;

const NavActions = styled.div`
  display: flex;
  align-items: center;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 10px;

  &:hover {
    color: #00aaff;
  }
`;


const Navbar = ({ setActiveView }) => {
  return (
    <Nav>
      <NavLinks>
        <Logo>BMViewGB</Logo>
        <NavLink href="#" onClick={() => setActiveView('map')}>Main Map View</NavLink>
        <NavLink href="#" onClick={() => setActiveView('timeseries')}>Time-Series Analysis/Download</NavLink>
        <NavLink href="#" onClick={() => setActiveView('benchmark')}>Regional Asset Benchmark</NavLink>
        <NavLink href="#" onClick={() => setActiveView('settings')}>Settings</NavLink>
        <NavLink href="#" onClick={() => setActiveView('about')}>About</NavLink>
      </NavLinks>
      <NavActions>
        <IconButton title="Toggle Night Mode">
          🌙
        </IconButton>
      </NavActions>
    </Nav>
  );
};

export default Navbar; 