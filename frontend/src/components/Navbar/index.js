import React from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';

const Nav = styled.nav`
  background-color: #333;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
`;

const NavBrand = styled.h1`
  font-size: 1.5rem;
  margin: 10px 0;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 20px;
`;

const StyledLink = styled(Link)`
  color: white;
  text-decoration: none;
  padding: 15px 10px;
  font-size: 1rem;

  &:hover {
    background-color: #555;
  }
`;

const Navbar = () => {
  return (
    <Nav>
      <NavBrand>BMViewGB</NavBrand>
      <NavLinks>
        <StyledLink to="/">Map View</StyledLink>
        <StyledLink to="/time-series">Time-Series Analysis</StyledLink>
        <StyledLink to="/asset-benchmark">Asset Benchmark</StyledLink>
      </NavLinks>
    </Nav>
  );
};

export default Navbar; 