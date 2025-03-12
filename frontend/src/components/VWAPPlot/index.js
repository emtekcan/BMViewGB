import React from 'react';
import styled from '@emotion/styled';
import Plot from 'react-plotly.js';

const PlotContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const PlotCard = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  max-width: 90%;
  max-height: 90%;
  overflow: auto;
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  
  &:hover {
    background-color: #d32f2f;
  }
`;

const NoDataMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

const VWAPPlot = ({ data, onClose }) => {
  if (!data || !data.times || data.times.length === 0) {
    return (
      <PlotContainer onClick={onClose}>
        <PlotCard onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={onClose}>×</CloseButton>
          <NoDataMessage>
            <h3>No VWAP Data Available</h3>
            <p>No data found for the selected region, date, and settlement period.</p>
          </NoDataMessage>
        </PlotCard>
      </PlotContainer>
    );
  }

  const plotData = [{
    x: data.times,
    y: data.vwap,
    type: 'scatter',
    mode: 'lines+markers',
    marker: { color: '#1976d2' },
    name: 'Running VWAP'
  }];

  const layout = {
    title: `Running VWAP for ${data.gsp_id} on ${data.date}, SP ${data.settlement_period}`,
    xaxis: {
      title: 'Time',
      tickangle: -45
    },
    yaxis: {
      title: 'VWAP (GBP/MWh)'
    },
    autosize: true,
    margin: {
      l: 50,
      r: 50,
      b: 100,
      t: 100,
      pad: 4
    }
  };

  return (
    <PlotContainer onClick={onClose}>
      <PlotCard onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        <Plot
          data={plotData}
          layout={layout}
          style={{ width: '100%', height: '500px' }}
          useResizeHandler={true}
        />
      </PlotCard>
    </PlotContainer>
  );
};

export default VWAPPlot; 