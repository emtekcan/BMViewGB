import React, { useState, useEffect, useCallback } from 'react';
import GBMap from './Map';
import DateSelector from './DateSelector';
import SettlementPeriodSlider from './SettlementPeriodSlider';
import InfoPanel from './InfoPanel';
import TechnologyMix from './TechnologyMix';
import RegionalInfoPanel from './RegionalInfoPanel';
import NumericsPanel from './NumericsPanel';
import styled from '@emotion/styled';
import { fetchDailyData } from '../services/api';
import { GB_ZONES } from './Map/zones';

const SplitViewContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
`;

const ViewContainer = styled.div`
  display: flex;
  flex-direction: row;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  height: 100%;
  flex: 1;
`;

const MapSection = styled.div`
  flex: ${props => props.isSplitView ? 3 : 4};
  position: relative;
  min-height: ${props => props.isSplitView ? '600px' : '700px'}; 
`;

const ControlSection = styled.div`
  flex: 2;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: #fdfdff;
  overflow-y: auto;
  min-width: 400px;
`;

const TopControlsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 10px 15px;
  font-size: 0.9rem;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  margin-top: 20px;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: #0056b3;
  }
  
  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

const TemporalControls = styled.div`
    margin-top: 20px;
`;

const PlaybackControls = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 10px;
`;

const AggregationSelector = styled.div`
    margin-top: 20px;
    & > label {
        margin-right: 10px;
    }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

const StatusMessage = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.error ? '#ffeeee' : '#eeffee'};
  border: 1px solid ${props => props.error ? '#ffaaaa' : '#aaffaa'};
  border-radius: 4px;
  min-height: 40px;
  word-wrap: break-word;
`;

const useMapViewController = (initialDate) => {
  const [selectedDate, setSelectedDate] = useState({
    year: initialDate?.year || 2024,
    month: initialDate?.month || 1,
    day: initialDate?.day || 1,
  });
  const [aggregation, setAggregation] = useState('30min');
  const [currentTimePoint, setCurrentTimePoint] = useState(initialDate?.settlementPeriod || 1);
  const [dailyData, setDailyData] = useState({ day_type: 'N', settlement_period: [], hourly: [], daily: [] });
  
  const [processedSpData, setProcessedSpData] = useState({});
  const [processedHrData, setProcessedHrData] = useState({});
  
  const [currentZoneData, setCurrentZoneData] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: 'Ready', error: false });
  const [showTechMix, setShowTechMix] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [showNumerics, setShowNumerics] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const handleDateChange = useCallback((name, value) => {
    setSelectedDate(prev => ({ ...prev, [name]: parseInt(value) }));
    setCurrentTimePoint(aggregation === 'hourly' ? 0 : 1);
    setIsPlaying(false);
  }, [aggregation]);

  const handleSliderChange = (event) => {
      setCurrentTimePoint(parseInt(event.target.value, 10));
      setIsPlaying(false);
  };

  const handleAggregationChange = (event) => {
    const newAggregation = event.target.value;
    setAggregation(newAggregation);
    setCurrentTimePoint(newAggregation === 'hourly' ? 0 : 1);
    setIsPlaying(false);
  };

  const handleZoneClick = (zoneId) => {
    const zoneInfo = GB_ZONES.find(z => z.id === zoneId);
    setSelectedRegion(zoneInfo);
  };
  
  const handleCloseRegionalPanel = () => {
    setSelectedRegion(null);
  };

  useEffect(() => {
    const loadDailyData = async () => {
      setLoading(true);
      setStatus({ message: 'Fetching daily data...', error: false });
      
      try {
        const data = await fetchDailyData(selectedDate);
        setDailyData(data);

        const spData = data.settlement_period.reduce((acc, item) => {
          if (!acc[item.settlement_period]) acc[item.settlement_period] = {};
          acc[item.settlement_period][item.gsp_group_id] = item;
          return acc;
        }, {});
        setProcessedSpData(spData);

        const hrData = data.hourly.reduce((acc, item) => {
          if (!acc[item.hour]) acc[item.hour] = {};
          acc[item.hour][item.gsp_group_id] = item;
          return acc;
        }, {});
        setProcessedHrData(hrData);

        setStatus({ message: '', error: false });
      } catch (error) {
        console.error('Error fetching daily imbalance data:', error);
        setStatus({ message: `Error fetching daily data: ${error.message}`, error: true });
        setDailyData({ day_type: 'N', settlement_period: [], hourly: [], daily: [] });
        setProcessedSpData({});
        setProcessedHrData({});
      } finally {
        setLoading(false);
      }
    };

    loadDailyData();
  }, [selectedDate]);

  useEffect(() => {
    let zoneDataForPeriod = {};
    let dataForInfoPanel = null;

    if (aggregation === '30min' && processedSpData[currentTimePoint]) {
      dataForInfoPanel = processedSpData[currentTimePoint];
    } else if (aggregation === 'hourly' && processedHrData[currentTimePoint]) {
      dataForInfoPanel = processedHrData[currentTimePoint];
    } else if (aggregation === 'daily' && dailyData.daily) {
      dataForInfoPanel = dailyData.daily.reduce((acc, item) => {
        acc[item.gsp_group_id] = item;
        return acc;
      }, {});
    }

    if (dataForInfoPanel) {
      zoneDataForPeriod = Object.entries(dataForInfoPanel).reduce((acc, [gsp, data]) => {
        acc[gsp] = data;
        return acc;
      }, {});
    }

    setCurrentZoneData(zoneDataForPeriod);
  }, [currentTimePoint, aggregation, processedSpData, processedHrData, dailyData.daily]);


  const getSliderConfig = () => {
    const { day_type } = dailyData;
    switch (aggregation) {
      case 'hourly':
        return {
          label: 'Hour',
          min: 0,
          max: 23,
          disabled: false,
        };
      case 'daily':
        return {
          label: 'Time Point',
          min: 1,
          max: 1,
          disabled: true,
        };
      case '30min':
      default:
        let max = 48;
        if (day_type === 'L') max = 50;
        if (day_type === 'S') max = 46;
        return {
          label: 'Settlement Period',
          min: 1,
          max: max,
          disabled: false,
        };
    }
  };

  const sliderConfig = getSliderConfig();

  useEffect(() => {
    if (!isPlaying || sliderConfig.disabled) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentTimePoint(prevTimePoint => {
        if (prevTimePoint >= sliderConfig.max) {
          return sliderConfig.min; // Loop back to the start
        }
        return prevTimePoint + 1;
      });
    }, 500 / playbackSpeed);

    return () => clearInterval(intervalId);
  }, [isPlaying, playbackSpeed, sliderConfig]);

  const dataForCurrentTimepoint = aggregation === 'daily' 
    ? dailyData.daily.reduce((acc, item) => { acc[item.gsp_group_id] = item; return acc; }, {})
    : (aggregation === 'hourly' ? processedHrData[currentTimePoint] : processedSpData[currentTimePoint]);
  
  const dailyDataForRegion = (regionId) => {
    if (!dailyData || !regionId) return [];
    return dailyData.settlement_period.filter(d => d.gsp_group_id === regionId);
  };

  return {
    selectedDate,
    aggregation,
    currentTimePoint,
    dailyData,
    processedSpData,
    processedHrData,
    currentZoneData,
    loading,
    status,
    showTechMix,
    selectedRegion,
    showNumerics,
    isPlaying,
    playbackSpeed,
    handleDateChange,
    handleSliderChange,
    handleAggregationChange,
    handleZoneClick,
    handleCloseRegionalPanel,
    sliderConfig,
    setIsPlaying,
    setPlaybackSpeed,
    setShowTechMix,
    setShowNumerics,
    dataForCurrentTimepoint,
    dailyDataForRegion,
  };
};


const MapInstance = ({ controller, isSplitView, showSplitButton, onSplitClick }) => {
  const {
    selectedDate,
    aggregation,
    currentTimePoint,
    dailyData,
    currentZoneData,
    loading,
    status,
    showTechMix,
    selectedRegion,
    showNumerics,
    isPlaying,
    playbackSpeed,
    handleDateChange,
    handleSliderChange,
    handleAggregationChange,
    handleZoneClick,
    handleCloseRegionalPanel,
    sliderConfig,
    setIsPlaying,
    setPlaybackSpeed,
    setShowTechMix,
    setShowNumerics,
    dataForCurrentTimepoint,
    dailyDataForRegion
  } = controller;

  useEffect(() => {
    if (isSplitView) {
      setShowNumerics(false);
    }
  }, [isSplitView, setShowNumerics]);

  return (
    <ViewContainer>
      <MapSection isSplitView={isSplitView}>
        {loading && <LoadingOverlay>Loading...</LoadingOverlay>}
        {showNumerics && <NumericsPanel data={dataForCurrentTimepoint} />}
        <GBMap zoneData={currentZoneData} onZoneClick={handleZoneClick} isSplitView={isSplitView} />
        <RegionalInfoPanel
          region={selectedRegion}
          onClose={handleCloseRegionalPanel}
          data={selectedRegion ? { [selectedRegion.id]: dataForCurrentTimepoint?.[selectedRegion.id] } : null}
          dailyData={selectedRegion ? dailyDataForRegion(selectedRegion.id) : null}
          isSplitView={isSplitView}
        />
      </MapSection>
      <ControlSection>
        <TopControlsContainer>
          <DateSelector
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
          />
          {!isSplitView && (
            <Button 
              onClick={() => setShowNumerics(!showNumerics)} 
              title="Toggle regional volume panel"
            >
              {showNumerics ? 'Hide' : 'Show'} Numerics
            </Button>
          )}
          {showSplitButton && (
            <Button onClick={onSplitClick}>
              {isSplitView ? 'Single View' : 'Split Screen'}
            </Button>
          )}
        </TopControlsContainer>
        {(loading || status.error) && (
          <StatusMessage error={status.error}>
            {status.message}
          </StatusMessage>
        )}
        <TemporalControls>
            <SettlementPeriodSlider
                label={sliderConfig.label}
                min={sliderConfig.min}
                max={sliderConfig.max}
                disabled={sliderConfig.disabled}
                currentSettlementPeriod={currentTimePoint}
                handleSliderChange={handleSliderChange}
            />
            <PlaybackControls>
                <Button onClick={() => setIsPlaying(true)} disabled={isPlaying || sliderConfig.disabled}>Play</Button>
                <Button onClick={() => setIsPlaying(false)} disabled={!isPlaying}>Pause</Button>
                <label>Speed:</label>
                <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                </select>
            </PlaybackControls>
        </TemporalControls>
        <AggregationSelector>
            <label htmlFor="aggregation">Temporal Aggregation:</label>
            <select id="aggregation" value={aggregation} onChange={handleAggregationChange}>
                <option value="30min">30-Minute</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
            </select>
        </AggregationSelector>

        {showTechMix ? (
          <TechnologyMix 
            data={dataForCurrentTimepoint} 
            dailyData={
              aggregation === 'hourly' 
                ? dailyData.hourly 
                : aggregation === 'daily' 
                  ? dailyData.daily 
                  : dailyData.settlement_period
            } 
            date={selectedDate}
          />
        ) : (
          <InfoPanel data={dataForCurrentTimepoint} dailyData={dailyData.settlement_period} currentTimePoint={currentTimePoint} />
        )}

        <Button onClick={() => setShowTechMix(prev => !prev)}>
          {showTechMix ? 'Hide Technology Mix' : 'Show Technology Mix'}
        </Button>

        {showTechMix && <InfoPanel data={dataForCurrentTimepoint} dailyData={dailyData.settlement_period} currentTimePoint={currentTimePoint} />}

      </ControlSection>
    </ViewContainer>
  );
};


const MapView = ({ initialDate }) => {
  const [isSplit, setIsSplit] = useState(false);
  const controller1 = useMapViewController(initialDate);
  const controller2 = useMapViewController(initialDate);

  return (
    <SplitViewContainer>
      <MapInstance 
        controller={controller1} 
        isSplitView={isSplit} 
        showSplitButton={true}
        onSplitClick={() => setIsSplit(!isSplit)}
      />
      {isSplit && <MapInstance controller={controller2} isSplitView={isSplit} />}
    </SplitViewContainer>
  );
};

export default MapView; 