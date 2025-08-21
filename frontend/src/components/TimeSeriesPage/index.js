import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import Plot from 'react-plotly.js';
import { fetchAvailableVariables } from "../../services/api";

const PageContainer = styled.div`
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h1`
  color: #333;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 5px;
`;

const Input = styled.input`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Select = styled.select`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  background-color: #007bff;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  
  &:hover {
    background-color: #0056b3;
  }
`;

const PlotContainer = styled.div`
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
`;

const TimeSeriesPage = () => {
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-01-07');
  const [xVariable, setXVariable] = useState('settlement_date');
  const [yVariable, setYVariable] = useState('balancing_cost');
  const [availableVars, setAvailableVars] = useState({ time: [], numeric: [] });
  const [plotData, setPlotData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVars = async () => {
      try {
        const data = await fetchAvailableVariables();
        setAvailableVars(data);
        setXVariable(data.time[0] || "");
        setYVariable(data.numeric[0] || "");
      } catch (e) {
        setError("Could not fetch variable list.");
      }
    };
    fetchVars();
  }, []);

  const handleGeneratePlot = async () => {
    setError(null);
    setPlotData(null);
    try {
        const params = new URLSearchParams({
            start_date: startDate,
            end_date: endDate,
            variables: `${xVariable},${yVariable}`
        });
        const response = await fetch(`/api/time-series/?${params}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch data');
        }
        const data = await response.json();
        
        const plotObject = {
            x: data.map(d => d[xVariable]),
            y: data.map(d => d[yVariable]),
            type: 'scatter',
            mode: 'lines+markers',
        };
        setPlotData(plotObject);

    } catch (e) {
      setError(e.message);
    }
  };

  const handleDownloadData = () => {
    // Similar to generate plot, but triggers a CSV download
    console.log("Download functionality to be implemented.");
  };

  return (
    <PageContainer>
      <Title>Time-Series Analysis</Title>
      <ControlsContainer>
        <ControlGroup>
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </ControlGroup>
        <ControlGroup>
          <Label>End Date</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </ControlGroup>
        <ControlGroup>
          <Label>X-Axis</Label>
          <Select value={xVariable} onChange={e => setXVariable(e.target.value)}>
            {availableVars.time.map(v => <option key={v} value={v}>{v}</option>)}
            {availableVars.numeric.map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </ControlGroup>
        <ControlGroup>
          <Label>Y-Axis</Label>
          <Select value={yVariable} onChange={e => setYVariable(e.target.value)}>
            {availableVars.numeric.map(v => <option key={v} value={v}>{v}</option>)}
          </Select>
        </ControlGroup>
        <Button onClick={handleGeneratePlot}>Generate Plot</Button>
        <Button onClick={handleDownloadData}>Download Data</Button>
      </ControlsContainer>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>Error: {error}</div>}

      <PlotContainer>
        {plotData ? (
          <Plot
            data={[plotData]}
            layout={{ 
              title: `${yVariable} vs ${xVariable}`,
              xaxis: { title: xVariable },
              yaxis: { title: yVariable },
              autosize: true
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        ) : (
          <div>Select variables and click "Generate Plot" to see the data.</div>
        )}
      </PlotContainer>
    </PageContainer>
  );
};

export default TimeSeriesPage; 