import React, { useState, useEffect } from 'react';
import GBMap from './components/Map';
import DateSelector from './components/DateSelector';
import VWAPPlot from './components/VWAPPlot';
import styled from '@emotion/styled';

const AppContainer = styled.div`
  display: flex;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
`;

const MapSection = styled.div`
  flex: 2;
  position: relative;
`;

const ControlSection = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  color: #333;
  margin-bottom: 20px;
  text-align: center;
`;

const StatusMessage = styled.div`
  margin-top: 10px;
  padding: 10px;
  background-color: ${props => props.error ? '#ffeeee' : '#eeffee'};
  border: 1px solid ${props => props.error ? '#ffaaaa' : '#aaffaa'};
  border-radius: 4px;
`;

const App = () => {
  const [zoneData, setZoneData] = useState({});
  const [selectedDate, setSelectedDate] = useState({
    year: 2021,
    month: 1,
    day: 1,
    settlementPeriod: 1,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: 'Ready', error: false });
  const [vwapData, setVwapData] = useState(null);
  const [showVwapPlot, setShowVwapPlot] = useState(false);

  const handleDateChange = (name, value) => {
    setSelectedDate(prev => ({ ...prev, [name]: value }));
  };

  const handleZoneClick = async (zoneId) => {
    console.log(`Zone clicked: ${zoneId}, Net Volume: ${zoneData[zoneId] || 'No data'}`);
    
    try {
      setStatus({ message: `Fetching VWAP data for ${zoneId}...`, error: false });
      
      const response = await fetch('http://localhost:5000/get-vwap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedDate,
          gspId: zoneId
        }),
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setVwapData({ 
            times: [], 
            vwap: [], 
            gsp_id: zoneId,
            date: `${selectedDate.year}-${selectedDate.month}-${selectedDate.day}`,
            settlement_period: selectedDate.settlementPeriod
          });
        } else {
          throw new Error(`Server responded with status: ${response.status}`);
        }
      } else {
        const data = await response.json();
        setVwapData(data);
      }
      
      setShowVwapPlot(true);
      setStatus({ message: 'VWAP data loaded', error: false });
    } catch (error) {
      console.error('Error fetching VWAP data:', error);
      setStatus({ message: `Error fetching VWAP data: ${error.message}`, error: true });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setStatus({ message: 'Fetching data...', error: false });
      
      try {
        console.log("Fetching data for:", selectedDate);
        
        const response = await fetch('http://localhost:5000/get-imbalance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(selectedDate),
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received data:", data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setZoneData(data);
        setStatus({ message: 'Data loaded successfully', error: false });
      } catch (error) {
        console.error('Error fetching data:', error);
        setStatus({ message: `Error: ${error.message}`, error: true });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  return (
    <div>
      <Title>BMViewGB</Title>
      <AppContainer>
        <MapSection>
          {loading ? (
            <div>Loading data...</div>
          ) : (
            <GBMap 
              zoneData={zoneData} 
              onZoneClick={handleZoneClick} 
            />
          )}
          <StatusMessage error={status.error}>
            {status.message}
          </StatusMessage>
        </MapSection>
        <ControlSection>
          <DateSelector onDateChange={handleDateChange} />
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <h3>Current Selection:</h3>
            <p>Date: {selectedDate.year}-{selectedDate.month}-{selectedDate.day}</p>
            <p>Settlement Period: {selectedDate.settlementPeriod}</p>
            <p>Time Range: {new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day, 0, (selectedDate.settlementPeriod - 1) * 30).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day, 0, selectedDate.settlementPeriod * 30).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} GMT</p>
          </div>
        </ControlSection>
      </AppContainer>
      
      {showVwapPlot && (
        <VWAPPlot 
          data={vwapData} 
          onClose={() => setShowVwapPlot(false)} 
        />
      )}
    </div>
  );
};

export default App; 