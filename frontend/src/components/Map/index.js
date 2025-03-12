import React, { useState } from 'react';
import styled from '@emotion/styled';
import { GB_ZONES } from './zones';

const MapContainer = styled.div`
  width: 600px;         /* or 100%, etc. */
  position: relative;   /* important for absolutely-positioned children */
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
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 18px;
  font-weight: bold;
  color: #333;
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const ZoneName = styled.div`
  margin-bottom: 5px;
`;

const ZoneVolume = styled.div`
  font-size: 16px;
  color: ${props => props.value > 0 ? '#2e7d32' : props.value < 0 ? '#c62828' : '#666'};
`;

const DebugInfo = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 5px;
  border-radius: 4px;
  max-width: 300px;
  max-height: 200px;
  overflow: auto;
`;

const GBMap = ({ zoneData, onZoneClick }) => {
  const [hoveredZone, setHoveredZone] = useState(null);
  const [debug, setDebug] = useState({});

  const getZoneColor = (zoneId) => {
    if (!zoneData || zoneData[zoneId] === undefined) return '#e8e8e8'; // Default color if no data
    
    const netVol = zoneData[zoneId];
    
    // Return white for zero
    if (netVol === 0) return '#FFFFFF';
    
    // Color scale for positive values (green)
    if (netVol > 0) {
      if (netVol >= 500) return '#00FF00'; // Maximum green
      if (netVol >= 400) return '#66FF66';
      if (netVol >= 300) return '#99FF99';
      if (netVol >= 200) return '#BBFFBB';
      if (netVol >= 100) return '#DDFFDD';
      return '#EEFFEE'; // Slight green
    }
    
    // Color scale for negative values (red)
    if (netVol <= -500) return '#FF0000'; // Maximum red
    if (netVol <= -400) return '#FF6666';
    if (netVol <= -300) return '#FF9999';
    if (netVol <= -200) return '#FFBBBB';
    if (netVol <= -100) return '#FFDDDD';
    return '#FFEEEE'; // Slight red
  };

  const handleMouseEnter = (zone) => {
    setHoveredZone({
      id: zone.id,
      name: zone.name,
      netVol: zoneData[zone.id] !== undefined ? zoneData[zone.id] : 'No data'
    });
  };

  return (
    <MapContainer>
      <svg
        viewBox="0 0 500 800"
        style={{ width: '100%', maxWidth: '600px' }}
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
        </ZoneInfo>
      )}
    </MapContainer>
  );
};

export default GBMap;
