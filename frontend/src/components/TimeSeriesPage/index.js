import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import Plot from "react-plotly.js";
import {
  fetchAvailableVariables,
  fetchTimeSeries,
  downloadAsCsv,
} from "../../services/api";

const PageContainer = styled.div`
  padding: 30px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
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

  &:disabled {
    background-color: #9fbef0;
    cursor: not-allowed;
  }
`;

const PlotContainer = styled.div`
  width: 100%;
  height: 600px;
  border: 1px solid #eee;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
`;

const TimeSeriesPage = () => {
  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-01-07");
  const [xVariable, setXVariable] = useState("settlement_date");
  const [yVariable, setYVariable] = useState("balancing_cost");
  const [availableVars, setAvailableVars] = useState({ time: [], numeric: [] });
  const [plotData, setPlotData] = useState(null);
  const [rawSeries, setRawSeries] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load available variables on mount
  useEffect(() => {
    const loadVars = async () => {
      try {
        const data = await fetchAvailableVariables();
        setAvailableVars(data);
        setXVariable(data.time[0] || "");
        setYVariable(data.numeric[0] || "");
      } catch {
        setError("Could not fetch variable list.");
      }
    };
    loadVars();
  }, []);

  const handleGeneratePlot = async () => {
    setError(null);
    setPlotData(null);
    setRawSeries(null);
    setLoading(true);

    try {
      const data = await fetchTimeSeries({
        startDate,
        endDate,
        variables: [xVariable, yVariable],
      });

      setRawSeries(data);

      const plotObject = {
        x: data.map((d) => d[xVariable]),
        y: data.map((d) => d[yVariable]),
        type: "scatter",
        mode: "lines+markers",
      };

      setPlotData(plotObject);
    } catch (e) {
      setError(e.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = () => {
    if (!rawSeries || !rawSeries.length) {
      setError("No data to download. Generate a plot first.");
      return;
    }
    downloadAsCsv(rawSeries, `timeseries_${xVariable}_vs_${yVariable}.csv`);
  };

  return (
    <PageContainer>
      <Title>Time-Series Analysis</Title>

      <ControlsContainer>
        <ControlGroup>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </ControlGroup>

        <ControlGroup>
          <Label>End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </ControlGroup>

        <ControlGroup>
          <Label>X-Axis</Label>
          <Select
            value={xVariable}
            onChange={(e) => setXVariable(e.target.value)}
          >
            {availableVars.time.map((v) => (
              <option key={`time-${v}`} value={v}>
                {v}
              </option>
            ))}
            {availableVars.numeric.map((v) => (
              <option key={`num-${v}`} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </ControlGroup>

        <ControlGroup>
          <Label>Y-Axis</Label>
          <Select
            value={yVariable}
            onChange={(e) => setYVariable(e.target.value)}
          >
            {availableVars.numeric.map((v) => (
              <option key={`ynum-${v}`} value={v}>
                {v}
              </option>
            ))}
          </Select>
        </ControlGroup>

        <Button onClick={handleGeneratePlot} disabled={loading}>
          {loading ? "Loading…" : "Generate Plot"}
        </Button>
        <Button onClick={handleDownloadData} disabled={!rawSeries?.length}>
          Download Data
        </Button>
      </ControlsContainer>

      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>Error: {error}</div>
      )}

      <PlotContainer>
        {plotData ? (
          <Plot
            data={[plotData]}
            layout={{
              title: `${yVariable} vs ${xVariable}`,
              xaxis: { title: xVariable },
              yaxis: { title: yVariable },
              autosize: true,
            }}
            style={{ width: "100%", height: "100%" }}
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
