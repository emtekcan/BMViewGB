import React from 'react';
import Plot from 'react-plotly.js';

const TechnologyMixPlot = ({ data, title, mode = 'both', date, isModal = false }) => {
  if (!data || data.length === 0) {
    return <div>No data available for plotting.</div>;
  }

  const isDaily = data.length > 0 && 'settlement_date' in data[0] && !('settlement_period' in data[0]) && !('hour' in data[0]);

  // Determine the time field based on data structure
  const getTimeValue = (periodData) => {
    if ('settlement_period' in periodData) return periodData.settlement_period;
    if ('hour' in periodData) return periodData.hour + 1;
    return 1; // Daily data has only one point
  };

  const getXAxisTitle = () => {
    if (isDaily) return 'Technology';
    if (data[0] && 'hour' in data[0]) return 'Hour';
    if (data[0] && 'settlement_period' in data[0]) return 'Settlement Period';
    return 'Time';
  };

  // Prepare data based on mode
  const generationTraces = {};
  const consumptionTraces = {};
  
  data.forEach(periodData => {
    const timeValue = getTimeValue(periodData);
    
    // Process generation mix (positive values - offers)
    if (mode !== 'consumption' && periodData.generation_mix) {
      for (const [fuel, value] of Object.entries(periodData.generation_mix)) {
        if (value > 0) {
          if (!generationTraces[fuel]) {
            generationTraces[fuel] = {
              x: [],
              y: [],
              name: fuel,
              type: isDaily ? 'bar' : 'scatter',
              mode: isDaily ? 'markers' : 'lines',
              stackgroup: 'generation',
              line: { width: 0 }
            };
          }
          generationTraces[fuel].x.push(isDaily ? fuel : timeValue);
          generationTraces[fuel].y.push(value);
        }
      }
    }
    
    // Process consumption mix (negative values - bids)
    if (mode !== 'generation' && periodData.consumption_mix) {
      for (const [fuel, value] of Object.entries(periodData.consumption_mix)) {
        if (value < 0) {
          if (!consumptionTraces[fuel]) {
            consumptionTraces[fuel] = {
              x: [],
              y: [],
              name: mode === 'consumption' ? fuel : `${fuel} (Bid)`,
              type: isDaily ? 'bar' : 'scatter',
              mode: isDaily ? 'markers' : 'lines',
              stackgroup: mode === 'consumption' ? 'consumption_positive' : 'consumption',
              line: { width: 0 }
            };
          }
          consumptionTraces[fuel].x.push(isDaily ? fuel : timeValue);
          consumptionTraces[fuel].y.push(mode === 'consumption' ? Math.abs(value) : value);
        }
      }
    }
  });

  // Color schemes for different fuel types
  const colorMap = {
    'WIND': '#3498db',
    'SOLAR': '#f39c12',
    'CCGT': '#95a5a6',
    'OCGT': '#7f8c8d',
    'COAL': '#34495e',
    'NUCLEAR': '#9b59b6',
    'HYDRO': '#00bcd4',
    'NPSHYD': '#00acc1',
    'PS': '#0097a7',
    'BIOMASS': '#27ae60',
    'BATTERY': '#e74c3c',
    'OTHER': '#bdc3c7',
    'DIESEL': '#d35400',
    'GAS': '#7f8c8d'
  };

  // Apply colors to traces
  const applyColors = (traces) => {
    return Object.values(traces).map(trace => {
      const fuelType = trace.name.replace(' (Bid)', '');
      const color = colorMap[fuelType] || '#95a5a6';
      return {
        ...trace,
        marker: { color },
        line: { ...trace.line, color }
      };
    });
  };

  const genData = applyColors(generationTraces).sort((a, b) => a.name.localeCompare(b.name));
  const conData = applyColors(consumptionTraces).sort((a, b) => a.name.localeCompare(b.name));
  
  let plotData = [];
  let baseTitle = title || `National Technology Mix for ${date}`;
  let layoutTitle = baseTitle;
  let yAxisTitle = 'Volume (MWh)';
  
  if (mode === 'generation') {
    plotData = genData;
    layoutTitle = `${baseTitle} - Generation (Offers)`;
  } else if (mode === 'consumption') {
    plotData = conData;
    layoutTitle = `${baseTitle} - Consumption (Bids)`;
    yAxisTitle = 'Volume (MWh) - Absolute Values';
  } else {
    plotData = [...genData, ...conData];
  }

  // Determine x-axis range for non-daily plots
  const xValues = isDaily ? [] : data.flatMap(pd => [getTimeValue(pd)]);
  const xMin = isDaily ? null : Math.min(...xValues);
  const xMax = isDaily ? null : Math.max(...xValues);

  return (
    <Plot
      data={plotData}
      layout={{
        title: layoutTitle,
        yaxis: { 
          title: yAxisTitle,
          zeroline: mode === 'both' && !isDaily,
          zerolinecolor: 'black',
          zerolinewidth: mode === 'both' && !isDaily ? 2 : 0,
          automargin: true,
        },
        xaxis: { 
          title: getXAxisTitle(),
          range: isDaily ? null : [xMin, xMax],
          automargin: true,
          type: isDaily ? 'category' : 'linear'
        },
        showlegend: true,
        legend: {
          traceorder: 'normal'
        },
        hovermode: 'x unified',
        plot_bgcolor: '#f8f9fa',
        paper_bgcolor: '#ffffff',
        margin: { t: 80, b: 80, l: 80, r: 40 },
        barmode: isDaily ? 'stack' : 'relative',
        height: isModal ? null : 500,
        width: isModal ? null : null,
        autosize: isModal,
      }}
      style={{ width: '100%', height: isModal ? '100%' : '500px' }}
      config={{ 
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['select2d', 'lasso2d'],
        toImageButtonOptions: {
          format: 'png',
          filename: `BMViewGB_TechMix_${date}_${mode}`,
          height: 700,
          width: 1200,
          scale: 1
        }
      }}
    />
  );
};

export default TechnologyMixPlot; 