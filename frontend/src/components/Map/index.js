import React, { useState } from 'react';
import styled from '@emotion/styled';
import { GB_ZONES } from './zones';

const MapContainer = styled.div`
  width: 100%;
  position: relative;
`;

const ZonePolygon = styled.path`
  fill: ${props => props.fillColor || '#e8e8e8'};
  stroke:rgb(82, 211, 179);
  stroke-width: 1;
  transition: fill 0.3s ease;

  &:hover {
    fill: ${props => props.hoverColor || '#d0d0d0'};
    cursor: pointer;
  }
`;

const ZoneInfo = styled.div`
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
  font-size: 16px;
  font-weight: bold;
  color: #333;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
  min-width: 250px;
`;

const ZoneName = styled.div`
  margin-bottom: 8px;
  font-size: 1.1rem;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
`;

const ZoneVolume = styled.div`
  font-size: 1rem;
  color: ${props => props.value > 0 ? '#2e7d32' : props.value < 0 ? '#c62828' : '#666'};
  margin-top: 5px;
`;

const VolumeBreakdown = styled.div`
  font-size: 1rem;
  color: #555;
  font-weight: normal;
  margin-top: 8px;
`;

const GBMap = ({ zoneData, onZoneClick, isSplitView }) => {
  const [hoveredZone, setHoveredZone] = useState(null);

  const getZoneColor = (zoneId) => {
    if (!zoneData || !zoneData[zoneId] || typeof zoneData[zoneId].net_volume !== 'number') return '#e8e8e8';

    const volumes = Object.values(zoneData).map(z => z.net_volume).filter(v => typeof v === 'number');
    if (!volumes.length) return '#e8e8e8';

    const maxAbsVolume = Math.max(...volumes.map(Math.abs));
    const netVol = zoneData[zoneId].net_volume;
    
    if (netVol === 0) return '#FFFFFF';
    if (maxAbsVolume === 0) return '#FFFFFF';
    
    const intensity = Math.min(Math.abs(netVol) / maxAbsVolume, 1);

    if (netVol > 0) { // Green scale
      if (intensity > 0.9) return '#004d00';
      if (intensity > 0.7) return '#008000';
      if (intensity > 0.5) return '#00b300';
      if (intensity > 0.3) return '#66ff66';
      if (intensity > 0.1) return '#b3ffb3';
      return '#e6ffe6';
    } else { // Red scale
      if (intensity > 0.9) return '#b30000';
      if (intensity > 0.7) return '#ff0000';
      if (intensity > 0.5) return '#ff4d4d';
      if (intensity > 0.3) return '#ff8080';
      if (intensity > 0.1) return '#ffb3b3';
      return '#ffe6e6';
    }
  };

  const handleMouseEnter = (zone) => {
    const data = zoneData[zone.id];
    setHoveredZone({
      id: zone.id,
      name: zone.name,
      netVol: data ? data.net_volume : 'No data',
      energyVol: data ? data.energy_volume : 'N/A',
      systemVol: data ? data.system_volume : 'N/A'
    });
  };

  return (
    <MapContainer>
      <svg
        viewBox="0 0 500 800"
        style={{ 
          width: '100%', 
          height: 'auto', 
          maxWidth: isSplitView ? '600px' : '800px' 
        }}
      >
        {GB_ZONES.map((zone) =>
          zone.paths.map((path, index) => (
            <ZonePolygon
              key={`${zone.id}-${index}`}
              d={path}
              fillColor={getZoneColor(zone.id)}
              hoverColor="#d0d0d0"
              onClick={() => onZoneClick && onZoneClick(zone.id)}
              onMouseEnter={() => handleMouseEnter(zone)}
              onMouseLeave={() => setHoveredZone(null)}
            />
          ))
        )}
      </svg>
      
      {hoveredZone && (
        <ZoneInfo>
          <ZoneName>{hoveredZone.name}</ZoneName>
          <ZoneVolume value={hoveredZone.netVol}>
            Net Volume: {typeof hoveredZone.netVol === 'number' ? 
              `${hoveredZone.netVol.toFixed(2)} MWh` : 
              hoveredZone.netVol}
          </ZoneVolume>
          <VolumeBreakdown>
            <div>Energy Actions: {typeof hoveredZone.energyVol === 'number' ? `${hoveredZone.energyVol.toFixed(2)} MWh` : hoveredZone.energyVol}</div>
            <div>System Actions: {typeof hoveredZone.systemVol === 'number' ? `${hoveredZone.systemVol.toFixed(2)} MWh` : hoveredZone.systemVol}</div>
          </VolumeBreakdown>
        </ZoneInfo>
      )}
    </MapContainer>
  );
};

export default GBMap;
