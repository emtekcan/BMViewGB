import React from 'react';
import styled from '@emotion/styled';

const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 200px;
`;

const SelectorLabel = styled.label`
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
`;

const Dropdown = styled.select`
  margin-bottom: 15px;
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
`;

const DateSelector = ({ onDateChange }) => {
  const years = [2021, 2022, 2023, 2024, 2025];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const settlementPeriods = Array.from({ length: 48 }, (_, i) => i + 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onDateChange(name, parseInt(value, 10));
  };

  return (
    <SelectorContainer>
      <SelectorLabel>Year:</SelectorLabel>
      <Dropdown name="year" onChange={handleChange} defaultValue="2021">
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </Dropdown>
      
      <SelectorLabel>Month:</SelectorLabel>
      <Dropdown name="month" onChange={handleChange} defaultValue="1">
        {months.map(month => <option key={month} value={month}>{month}</option>)}
      </Dropdown>
      
      <SelectorLabel>Day:</SelectorLabel>
      <Dropdown name="day" onChange={handleChange} defaultValue="1">
        {days.map(day => <option key={day} value={day}>{day}</option>)}
      </Dropdown>
      
      <SelectorLabel>Settlement Period:</SelectorLabel>
      <Dropdown name="settlementPeriod" onChange={handleChange} defaultValue="1">
        {settlementPeriods.map(sp => <option key={sp} value={sp}>{sp}</option>)}
      </Dropdown>
    </SelectorContainer>
  );
};

export default DateSelector; 