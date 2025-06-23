import React from 'react';
import styled from '@emotion/styled';

const SelectorContainer = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 10px;
`;

const SelectorGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const SelectorLabel = styled.label`
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
  font-size: 0.9rem;
`;

const Dropdown = styled.select`
  padding: 6px 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
`;

const DateSelector = ({ selectedDate, onDateChange }) => {
  const years = Array.from({ length: 6 }, (_, i) => 2021 + i); // 2021 to 2026
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleChange = (e) => {
    const { name, value } = e.target;
    onDateChange(name, parseInt(value, 10));
  };

  return (
    <SelectorContainer>
      <SelectorGroup>
        <SelectorLabel>Year</SelectorLabel>
        <Dropdown name="year" value={selectedDate.year} onChange={handleChange}>
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </Dropdown>
      </SelectorGroup>
      
      <SelectorGroup>
        <SelectorLabel>Month</SelectorLabel>
        <Dropdown name="month" value={selectedDate.month} onChange={handleChange}>
        {months.map(month => <option key={month} value={month}>{month}</option>)}
      </Dropdown>
      </SelectorGroup>
      
      <SelectorGroup>
        <SelectorLabel>Day</SelectorLabel>
        <Dropdown name="day" value={selectedDate.day} onChange={handleChange}>
        {days.map(day => <option key={day} value={day}>{day}</option>)}
      </Dropdown>
      </SelectorGroup>
    </SelectorContainer>
  );
};

export default DateSelector; 