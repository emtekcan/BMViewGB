import React from 'react';
import { Slider } from '@mui/material';
import { SliderContainer } from './styles';

const TimeSlider = ({ value, onChange, min, max }) => {
  return (
    <SliderContainer>
      <Slider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        valueLabelDisplay="auto"
      />
    </SliderContainer>
  );
};

export default TimeSlider; 