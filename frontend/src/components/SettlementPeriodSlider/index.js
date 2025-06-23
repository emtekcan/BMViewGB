import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';

const SliderContainer = styled.div`
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
  border: 1px solid #e9ecef;
`;

const SliderWrapper = styled.div`
  position: relative;
  height: 50px; /* Height for ticks and slider */
  display: flex;
  align-items: center;
`;

const RangeInput = styled.input`
  width: 100%;
  cursor: pointer;
  height: 8px;
  background: #dee2e6;
  border-radius: 4px;
  outline: none;
  appearance: none; /* Override default look */
  z-index: 2; /* Above ticks */
  position: relative; /* Needed for z-index */

  &:disabled {
    background: #e9ecef;
    cursor: not-allowed;
  }

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    background: ${props => props.disabled ? '#adb5bd' : '#007bff'};
    border-radius: 50%;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    margin-top: -6px; /* Center thumb vertically */
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: ${props => props.disabled ? '#adb5bd' : '#007bff'};
    border-radius: 50%;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    border: none;
  }
`;

const TicksContainer = styled.div`
  position: absolute;
  top: 25px; /* Position ticks below the slider track center */
  left: 10px; /* Align with slider thumb start/end */
  right: 10px;
  height: 15px;
  display: flex;
  justify-content: space-between;
  pointer-events: none; /* Ticks shouldn't interfere with slider */
  z-index: 1; /* Below slider thumb */
`;

const Tick = styled.span`
  position: relative;
  display: flex;
  justify-content: center;
  text-align: center;
  width: 1px; /* Minimal width */
  height: 5px;
  background-color: #adb5bd;
  line-height: 20px; /* Spacing for label */
  font-size: 10px;
  color: #495057;
  /* Add number label */
  &::after {
    content: attr(data-label);
    position: absolute;
    top: 8px; /* Position label below tick */
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
  }
`;

const CurrentValueDisplay = styled.div`
  text-align: center;
  font-weight: bold;
  margin-top: 5px; /* Space below ticks */
  font-size: 1.1em;
  color: #333;
`;

const SliderLabel = styled.label`
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
  display: block; /* Take full width */
  text-align: center;
`;

const SliderLabelContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
`;

const SliderLabelText = styled.span`
  font-weight: bold;
  color: #333;
  margin-right: 8px;
`;

const ValueInput = styled.input`
  font-weight: bold;
  font-size: 1em;
  color: #333;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 4px 8px;
  width: 50px; /* Adjust width as needed */
  text-align: center;

  &:disabled {
    background-color: #e9ecef;
    color: #6c757d;
  }

  /* Remove arrows for number input */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const SettlementPeriodSlider = ({
  label,
  min,
  max,
  disabled,
  currentSettlementPeriod,
  handleSliderChange,
}) => {
  const [inputValue, setInputValue] = useState(currentSettlementPeriod);

  useEffect(() => {
    setInputValue(currentSettlementPeriod);
  }, [currentSettlementPeriod]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const validateAndSubmit = (currentInput) => {
    const numValue = parseInt(currentInput, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      handleSliderChange({ target: { value: String(numValue) } });
    } else {
      setInputValue(currentSettlementPeriod);
    }
  };

  const handleInputBlur = (e) => {
    validateAndSubmit(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      validateAndSubmit(e.target.value);
      e.target.blur();
    }
  };
  
  const range = max - min + 1;
  const periods = Array.from({ length: range }, (_, i) => i + min);
  
  // Determine tick interval based on range to avoid clutter
  let tickInterval;
  if (range <= 24) tickInterval = 3; // For hourly
  else if (range <= 50) tickInterval = 6; // For settlement periods
  else tickInterval = 10;

  const showTickLabel = (p) => p === min || p === max || (p - min) % tickInterval === 0;

  return (
    <SliderContainer>
      <SliderLabelContainer>
        <SliderLabelText>{label}:</SliderLabelText>
        <ValueInput
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          min={min}
          max={max}
          disabled={disabled}
        />
      </SliderLabelContainer>
      <SliderWrapper>
        <RangeInput
          type="range"
          min={min}
          max={max}
          step="1"
          value={currentSettlementPeriod}
          onChange={handleSliderChange}
          disabled={disabled}
        />
        <TicksContainer>
          {!disabled && periods.map(p => (
            <Tick key={p} data-label={showTickLabel(p) ? p : ''} />
          ))}
        </TicksContainer>
      </SliderWrapper>
    </SliderContainer>
  );
};

export default SettlementPeriodSlider; 