import React, { useState } from 'react';
import styled from '@emotion/styled';
import { GB_ZONES } from '../Map/zones';

const zoneNameMap = GB_ZONES.reduce((acc, zone) => {
    acc[zone.id] = zone.name;
    return acc;
}, {});

const PageContainer = styled.div`
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h1`
  color: #333;
`;

const FormContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 5px;
`;

const Input = styled.input`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Select = styled.select`
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
`;

const Button = styled.button`
  padding: 12px 20px;
  border-radius: 4px;
  border: none;
  background-color: #28a745;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  grid-column: 1 / -1;
  
  &:hover {
    background-color: #218838;
  }
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  
  th, td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: left;
  }
  
  th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
`;

const RegionalAssetBenchmarkPage = () => {
    const [params, setParams] = useState({
        start_date: '2024-01-01',
        end_date: '2024-01-07',
        asset_type: 'offer',
        capacity_mw: '50',
        price_bid: '',
        price_offer: '100',
    });
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setParams(prev => ({ ...prev, [name]: value }));
    };

    const handleRunSimulation = async () => {
        setLoading(true);
        setError(null);
        setResults(null);
        try {
            const query = new URLSearchParams(params);
            const response = await fetch(`/api/asset-benchmark/?${query}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch benchmark data');
            }
            const data = await response.json();
            setResults(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer>
            <Title>Regional Asset Benchmark</Title>
            <FormContainer>
                <ControlGroup>
                    <Label>Start Date</Label>
                    <Input type="date" name="start_date" value={params.start_date} onChange={handleInputChange} />
                </ControlGroup>
                <ControlGroup>
                    <Label>End Date</Label>
                    <Input type="date" name="end_date" value={params.end_date} onChange={handleInputChange} />
                </ControlGroup>
                <ControlGroup>
                    <Label>Asset Type</Label>
                    <Select name="asset_type" value={params.asset_type} onChange={handleInputChange}>
                        <option value="offer">Offer Only</option>
                        <option value="bid">Bid Only</option>
                        <option value="both">Both</option>
                    </Select>
                </ControlGroup>
                <ControlGroup>
                    <Label>Capacity (MW)</Label>
                    <Input type="number" name="capacity_mw" value={params.capacity_mw} onChange={handleInputChange} />
                </ControlGroup>
                <ControlGroup>
                    <Label>Offer Price (£/MWh)</Label>
                    <Input type="number" name="price_offer" value={params.price_offer} onChange={handleInputChange} disabled={params.asset_type === 'bid'}/>
                </ControlGroup>
                <ControlGroup>
                    <Label>Bid Price (£/MWh)</Label>
                    <Input type="number" name="price_bid" value={params.price_bid} onChange={handleInputChange} disabled={params.asset_type === 'offer'}/>
                </ControlGroup>
                <Button onClick={handleRunSimulation} disabled={loading}>
                    {loading ? 'Running Simulation...' : 'Run Simulation'}
                </Button>
            </FormContainer>

            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {results && (
                <ResultsTable>
                    <thead>
                        <tr>
                            <th>GSP Group</th>
                            <th>Accepted Volume (MWh)</th>
                            <th>Skipped Volume (MWh)</th>
                            <th>Skip Rate (%)</th>
                            <th>Estimated Revenue (£)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.sort((a,b) => b.estimated_revenue - a.estimated_revenue).map(res => (
                            <tr key={res.gsp_group_id}>
                                <td>{zoneNameMap[res.gsp_group_id] || res.gsp_group_id}</td>
                                <td>{res.accepted_volume_mwh.toFixed(2)}</td>
                                <td>{res.skipped_volume_mwh.toFixed(2)}</td>
                                <td>{res.skip_rate_percent.toFixed(2)}</td>
                                <td>{res.estimated_revenue.toLocaleString('en-GB')}</td>
                            </tr>
                        ))}
                    </tbody>
                </ResultsTable>
            )}
        </PageContainer>
    );
};

export default RegionalAssetBenchmarkPage; 