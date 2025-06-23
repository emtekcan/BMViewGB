import React, { useState } from 'react';
import styled from '@emotion/styled';

const PanelContainer = styled.div`
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 2px solid #007bff;
  padding-bottom: 5px;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: 0.9rem;
  color: #6c757d;

  &.clickable {
    cursor: pointer;
    text-decoration: underline;
    color: #0056b3;
    &:hover {
      color: #00aaff;
    }
  }
`;

const StatValue = styled.span`
  font-size: 1.2rem;
  font-weight: bold;
  color: #343a40;
`;

const SubStatItem = styled(StatItem)`
    margin-left: 15px;
    margin-top: -5px;
`;

const SectionTitle = styled.div`
    grid-column: 1 / -1;
    font-weight: bold;
    margin-top: 10px;
    margin-bottom: -5px;
    color: #333;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: ${props => props.isCollapsible ? 'pointer' : 'default'};

    &:hover {
        background-color: ${props => props.isCollapsible ? '#f0f0f0' : 'transparent'};
    }
`;

const CollapseIcon = styled.span`
    font-size: 1.2rem;
    font-weight: bold;
`;

const CollapsibleContent = styled.div`
  grid-column: 1 / -1;
  display: contents; /* Allows children to be part of the parent grid */
`;

const InfoPanel = ({ data, dailyData, currentTimePoint }) => {
  const [costCollapsed, setCostCollapsed] = useState(true);
  const [demandCollapsed, setDemandCollapsed] = useState(true);

  const aggregateStats = (currentData) => {
    if (!currentData || Object.keys(currentData).length === 0) {
      return {
        acceptedOffers: 0,
        acceptedBids: 0,
        totalActions: 0,
        netImbalanceVolume: 0,
        energyActionVolume: 0,
        systemActionVolume: 0,
        balancingCost: 0,
      };
    }

    const stats = Object.values(currentData).reduce((acc, region) => {
      acc.acceptedOffers += region.offers_count;
      acc.acceptedBids += region.bids_count;
      acc.totalActions += region.boas_count;
      acc.netImbalanceVolume += region.net_volume;
      acc.energyActionVolume += region.energy_volume;
      acc.systemActionVolume += region.system_volume;
      acc.balancingCost += region.balancing_cost;
      return acc;
    }, {
      acceptedOffers: 0,
      acceptedBids: 0,
      totalActions: 0,
      netImbalanceVolume: 0,
      energyActionVolume: 0,
      systemActionVolume: 0,
      balancingCost: 0,
    });
    
    return stats;
  };
  
  const calculateCumulativeCost = () => {
    if (!dailyData || !dailyData.length) return 0;
    
    const cumulative = dailyData
      .filter(item => item.settlement_period <= currentTimePoint)
      .reduce((total, item) => total + item.balancing_cost, 0);
      
    return cumulative;
  };

  const keyStats = aggregateStats(data);
  const cumulativeCost = calculateCumulativeCost();

  return (
    <PanelContainer>
      <Title>Key Statistics</Title>
      <StatGrid>
        <SectionTitle>Action Count</SectionTitle>
        <StatItem>
          <StatLabel>Accepted Offers</StatLabel>
          <StatValue>{keyStats.acceptedOffers}</StatValue>
        </StatItem>
        <StatItem>
          <StatLabel>Accepted Bids</StatLabel>
          <StatValue>{keyStats.acceptedBids}</StatValue>
        </StatItem>
        <StatItem style={{ gridColumn: '1 / -1' }}>
          <StatLabel>Total Actions</StatLabel>
          <StatValue>{keyStats.totalActions}</StatValue>
        </StatItem>

        <SectionTitle>Net Imbalance Volume</SectionTitle>
         <StatItem>
          <StatLabel>Total</StatLabel>
          <StatValue>{keyStats.netImbalanceVolume.toFixed(2)} MWh</StatValue>
        </StatItem>
        <StatItem></StatItem> {/* Spacer */}
        <SubStatItem>
            <StatLabel>from Energy Actions</StatLabel>
            <StatValue>{keyStats.energyActionVolume.toFixed(2)} MWh</StatValue>
        </SubStatItem>
         <SubStatItem>
            <StatLabel>from System Actions</StatLabel>
            <StatValue>{keyStats.systemActionVolume.toFixed(2)} MWh</StatValue>
        </SubStatItem>

        <SectionTitle isCollapsible onClick={() => setCostCollapsed(!costCollapsed)}>
          Balancing Cost
          <CollapseIcon>{costCollapsed ? '+' : '-'}</CollapseIcon>
        </SectionTitle>
        {!costCollapsed && (
          <CollapsibleContent>
            <StatItem>
              <StatLabel className="clickable">Period Cost</StatLabel>
              <StatValue>£{keyStats.balancingCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel className="clickable">Cumulative Daily Cost</StatLabel>
              <StatValue>£{cumulativeCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</StatValue>
            </StatItem>
          </CollapsibleContent>
        )}

        <SectionTitle isCollapsible onClick={() => setDemandCollapsed(!demandCollapsed)}>
          System Demand
          <CollapseIcon>{demandCollapsed ? '+' : '-'}</CollapseIcon>
        </SectionTitle>
        {!demandCollapsed && (
          <CollapsibleContent>
            <StatItem>
              <StatLabel className="clickable">Forecast Demand</StatLabel>
              <StatValue>{keyStats.forecastDemand}</StatValue>
            </StatItem>
            <StatItem>
              <StatLabel className="clickable">Actual Demand</StatLabel>
              <StatValue>{keyStats.actualDemand}</StatValue>
            </StatItem>
            <StatItem style={{ gridColumn: '1 / -1' }}>
                <StatLabel>Demand Difference</StatLabel>
                <StatValue>{keyStats.demandDifference}</StatValue>
            </StatItem>
          </CollapsibleContent>
        )}

      </StatGrid>
    </PanelContainer>
  );
};

export default InfoPanel; 