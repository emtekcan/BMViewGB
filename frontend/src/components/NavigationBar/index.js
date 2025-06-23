import React from 'react';
import { Link } from 'react-router-dom';
import styled from '@emotion/styled';

const Nav = styled.nav`
  background-color: #2c3e50;
  padding: 0 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

const NavBrand = styled.h1`
  font-size: 1.6rem;
  margin: 12px 0;
  font-weight: 600;
`;

const NavLinks = styled.div`
  display: flex;
  gap: 25px;
`;

const StyledLink = styled(Link)`
  color: #ecf0f1;
  text-decoration: none;
  padding: 18px 12px;
  font-size: 1.05rem;
  font-weight: 500;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: #34495e;
    color: #ffffff;
  }
`;

const NavigationBar = () => {
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

export default NavigationBar; 