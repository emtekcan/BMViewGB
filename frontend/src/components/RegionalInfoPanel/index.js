import React, { useState } from 'react';
import styled from '@emotion/styled';
import TechnologyMix from '../TechnologyMix';

const PanelContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  width: ${props => props.isSplitView ? '350px' : '450px'};
  max-height: calc(100% - 40px);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

const PanelHeader = styled.div`
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 1.2rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #888;
  &:hover {
    color: #333;
  }
`;

const PanelBody = styled.div`
  padding: 15px;
  overflow-y: auto;
`;

const Button = styled.button`
  width: 100%;
  padding: 10px 15px;
  font-size: 0.9rem;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  margin-bottom: 10px;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: #0056b3;
  }
`;

const RegionalInfoPanel = ({ region, data, dailyData, onClose, isSplitView }) => {
  const [showTechMix, setShowTechMix] = useState(false);

  if (!region) return null;

  return (
    <PanelContainer isSplitView={isSplitView}>
      <PanelHeader>
        <PanelTitle>{region.name}</PanelTitle>
        <CloseButton onClick={onClose}>&times;</CloseButton>
      </PanelHeader>
      <PanelBody>
        <Button onClick={() => setShowTechMix(prev => !prev)}>
          {showTechMix ? 'Hide' : 'Show'} Regional Technology Mix
        </Button>
        {showTechMix && (
          <TechnologyMix
            data={data}
            dailyData={dailyData}
            title={`Technology Mix for ${region.name}`}
          />
        )}
      </PanelBody>
    </PanelContainer>
  );
};

export default RegionalInfoPanel; 