import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MapView from './components/MapView';
import TimeSeriesPage from './components/TimeSeriesPage';
import RegionalAssetBenchmarkPage from './components/RegionalAssetBenchmarkPage';
import NavigationBar from './components/NavigationBar';
import styled from '@emotion/styled';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #eef2f5;
`;

const ContentContainer = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  margin-bottom: 20px;
  align-self: center;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: #0056b3;
  }

  &.active {
      background-color: #28a745;
  }
   &.active:hover {
      background-color: #218838;
  }
`;

const ViewsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 100%;
  flex-grow: 1;
`;

const ViewWrapper = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const MainView = () => {
  const [isSplitView, setIsSplitView] = React.useState(false);
  const initialDate1 = { year: 2021, month: 3, day: 14 };
  const initialDate2 = { year: 2021, month: 3, day: 15 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Button
        onClick={() => setIsSplitView(prev => !prev)}
        className={isSplitView ? 'active' : ''}
      >
        {isSplitView ? 'Close Comparison View' : 'Compare Dates (Split View)'}
      </Button>
      <ViewsWrapper>
        <ViewWrapper>
          <MapView key="map1" initialDate={initialDate1} isSplitView={isSplitView} />
        </ViewWrapper>
        {isSplitView && (
          <ViewWrapper>
            <MapView key="map2" initialDate={initialDate2} isSplitView={isSplitView} />
          </ViewWrapper>
        )}
      </ViewsWrapper>
    </div>
  );
};

function App() {
  const initialDate = { year: 2024, month: 1, day: 1, settlementPeriod: 1 };

  return (
    <Router>
      <AppContainer>
        <NavigationBar />
        <ContentContainer>
          <Routes>
            <Route path="/" element={<MapView initialDate={initialDate} />} />
            <Route path="/time-series" element={<TimeSeriesPage />} />
            <Route path="/asset-benchmark" element={<RegionalAssetBenchmarkPage />} />
          </Routes>
        </ContentContainer>
      </AppContainer>
    </Router>
  );
}

export default App; 