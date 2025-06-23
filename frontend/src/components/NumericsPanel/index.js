import React from 'react';
import styled from '@emotion/styled';
import { GB_ZONES } from '../Map/zones';

const PanelContainer = styled.div`
  position: absolute;
  left: 15px;
  top: 15px;
  width: 560px;
  background-color: rgba(255, 255, 255, 0.9);
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 10;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const PanelTitle = styled.h4`
  margin: 0;
  padding: 12px 15px;
  background-color: #e9ecef;
  border-bottom: 1px solid #ccc;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
`;

const RegionList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
`;

const RegionItem = styled.li`
  padding: 10px 15px;
  border-bottom: 1px solid #eee;

  &:nth-of-type(odd) {
    border-right: 1px solid #eee;
  }

  &:nth-of-type(7),
  &:nth-of-type(14) {
    border-bottom: none;
  }
`;

const RegionName = styled.div`
  font-weight: bold;
  color: #333;
`;

const VolumeText = styled.div`
  font-size: 0.95rem;
  color: #555;
  margin-left: 10px;
`;

const NumericsPanel = ({ data }) => {
  return (
    <PanelContainer>
      <PanelTitle>Regional Volumes (MWh)</PanelTitle>
      <RegionList>
        {GB_ZONES.map(zone => {
          const regionData = data?.[zone.id];
          return (
            <RegionItem key={zone.id}>
              <RegionName>{zone.name}</RegionName>
              <VolumeText>
                Net: {regionData ? regionData.net_volume.toFixed(2) : 'N/A'}
              </VolumeText>
              <VolumeText>
                Energy: {regionData ? regionData.energy_volume.toFixed(2) : 'N/A'}
              </VolumeText>
              <VolumeText>
                System: {regionData ? regionData.system_volume.toFixed(2) : 'N/A'}
              </VolumeText>
            </RegionItem>
          );
        })}
      </RegionList>
    </PanelContainer>
  );
};

export default NumericsPanel; 