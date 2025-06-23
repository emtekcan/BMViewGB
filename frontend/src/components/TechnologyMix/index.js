import React, { useState } from 'react';
import styled from '@emotion/styled';
import TechnologyMixPlot from '../TechnologyMixPlot';

const TechMixContainer = styled.div`
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  margin-top: 20px;
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 2px solid #28a745;
  padding-bottom: 5px;
`;

const MixGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
`;

const MixSection = styled.div``;

const MixTitle = styled.h4`
  color: ${props => props.color};
`;

const TechList = styled.ul`
  list-style: none;
  padding: 0;
`;

const TechListItem = styled.li`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  padding: 4px 0;
  border-bottom: 1px solid #eee;

  &.total {
    font-weight: bold;
    font-size: 1rem;
    border-top: 2px solid #333;
    margin-top: 5px;
    padding-top: 5px;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 8px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  background-color: ${props => props.active ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 5px;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${props => props.active ? '#0056b3' : '#5a6268'};
  }
`;

const ModalBackdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90vw;
  height: 90vh;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const ModalTitle = styled.h2`
    margin: 0;
`;

const CloseModalButton = styled.button`
    padding: 5px 10px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
`;

const TechnologyMix = ({ data, dailyData, title, date }) => {
  const [showPlot, setShowPlot] = useState(false);
  const [plotMode, setPlotMode] = useState('both');
  const [showModal, setShowModal] = useState(false);

  const formattedDate = date ? `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}` : '';

  const aggregateMix = (data, mix_type) => {
    if (!data) return {};
    return Object.values(data).reduce((acc, region) => {
      const mix = region[mix_type];
      if (mix) {
        for (const [tech, value] of Object.entries(mix)) {
          acc[tech] = (acc[tech] || 0) + value;
        }
      }
      return acc;
    }, {});
  };

  const generationMix = aggregateMix(data, 'generation_mix');
  const consumptionMix = aggregateMix(data, 'consumption_mix');
  
  const totalGeneration = Object.values(generationMix).reduce((sum, value) => sum + value, 0);
  const totalConsumption = Object.values(consumptionMix).reduce((sum, value) => sum + value, 0);
  
  const hasGenerationData = Object.keys(generationMix).length > 0;
  const hasConsumptionData = Object.keys(consumptionMix).length > 0;

  const handlePlotModeChange = (mode) => {
    setPlotMode(mode);
    if (!showPlot) {
      setShowPlot(true);
    }
  };
  
  const renderPlot = (isModal = false) => (
    <TechnologyMixPlot 
      data={dailyData} 
      title={title} 
      mode={plotMode}
      date={formattedDate}
      isModal={isModal}
    />
  );

  return (
    <TechMixContainer>
      <Title>{title || 'National Technology Mix'}</Title>
      
      {!hasGenerationData && !hasConsumptionData ? (
        <div>No technology data available for this period.</div>
      ) : (
        <MixGrid>
          <MixSection>
            <MixTitle color="#16a085">Generation (Offers)</MixTitle>
            {hasGenerationData ? (
              <TechList>
                <TechListItem className="total">
                  <span>TOTAL</span>
                  <strong>{totalGeneration.toFixed(2)} MWh</strong>
                </TechListItem>
                {Object.entries(generationMix).sort(([,a],[,b]) => b-a).map(([tech, value]) => (
                  <TechListItem key={tech}>
                    <span>{tech}</span>
                    <strong>{value.toFixed(2)} MWh</strong>
                  </TechListItem>
                ))}
              </TechList>
            ) : <p>None</p>}
          </MixSection>
          
          <MixSection>
            <MixTitle color="#c0392b">Consumption (Bids)</MixTitle>
            {hasConsumptionData ? (
              <TechList>
                <TechListItem className="total">
                  <span>TOTAL</span>
                  <strong>{totalConsumption.toFixed(2)} MWh</strong>
                </TechListItem>
                {Object.entries(consumptionMix).sort(([,a],[,b]) => Math.abs(b)-Math.abs(a)).map(([tech, value]) => (
                  <TechListItem key={tech}>
                    <span>{tech}</span>
                    <strong>{value.toFixed(2)} MWh</strong>
                  </TechListItem>
                ))}
              </TechList>
            ) : <p>None</p>}
          </MixSection>
        </MixGrid>
      )}

      {dailyData && (
        <ButtonGroup>
          <Button active={showPlot && plotMode === 'generation'} onClick={() => handlePlotModeChange('generation')}>
            Plot Generation Only
          </Button>
          <Button active={showPlot && plotMode === 'consumption'} onClick={() => handlePlotModeChange('consumption')}>
            Plot Consumption Only
          </Button>
          <Button active={showPlot && plotMode === 'both'} onClick={() => handlePlotModeChange('both')}>
            Plot Both
          </Button>
          {showPlot && (
            <>
              <Button onClick={() => setShowPlot(false)}>Hide Plot</Button>
              <Button onClick={() => setShowModal(true)}>Expand Plot</Button>
            </>
          )}
        </ButtonGroup>
      )}

      {showPlot && !showModal && renderPlot()}
      
      {showModal && (
        <ModalBackdrop>
          <ModalContent>
            <ModalHeader>
              <ModalTitle>{title || `National Technology Mix for ${formattedDate}`}</ModalTitle>
              <CloseModalButton onClick={() => setShowModal(false)}>Close</CloseModalButton>
            </ModalHeader>
            {renderPlot(true)}
          </ModalContent>
        </ModalBackdrop>
      )}
    </TechMixContainer>
  );
};

export default TechnologyMix; 