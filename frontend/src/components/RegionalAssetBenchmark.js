import React from 'react';
import styled from '@emotion/styled';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 20px;
`;

const FormContainer = styled.div`
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const FormControl = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 5px;
  font-weight: bold;
`;

const Input = styled.input`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Select = styled.select`
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 1rem;
  cursor: pointer;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  grid-column: 1 / -1; /* Span all columns */
  justify-self: center;
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
`;

const Th = styled.th`
  background-color: #333;
  color: white;
  padding: 12px;
  text-align: left;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid #ddd;
  text-align: right;

  &:first-of-type {
      text-align: left;
      font-weight: bold;
  }
`;

const Tr = styled.tr`
    &:nth-of-type(even) {
        background-color: #f2f2f2;
    }
    &:hover {
        background-color: #e9ecef;
    }
`;

const benchmarkData = [
    { region: 'East England', acceptedVol: 1200, revenue: 60000, skippedVol: 150, skippedRevenue: 7500, skipRate: 11.1 },
    { region: 'East Midlands', acceptedVol: 1100, revenue: 55000, skippedVol: 200, skippedRevenue: 10000, skipRate: 15.4 },
    { region: 'London', acceptedVol: 500, revenue: 25000, skippedVol: 50, skippedRevenue: 2500, skipRate: 9.1 },
    { region: 'North East', acceptedVol: 950, revenue: 47500, skippedVol: 180, skippedRevenue: 9000, skipRate: 15.9 },
    { region: 'North West', acceptedVol: 1300, revenue: 65000, skippedVol: 220, skippedRevenue: 11000, skipRate: 14.5 },
    { region: 'South East', acceptedVol: 1500, revenue: 75000, skippedVol: 100, skippedRevenue: 5000, skipRate: 6.3 },
    { region: 'South West', acceptedVol: 800, revenue: 40000, skippedVol: 120, skippedRevenue: 6000, skipRate: 13.0 },
    { region: 'Yorkshire', acceptedVol: 1050, revenue: 52500, skippedVol: 250, skippedRevenue: 12500, skipRate: 19.2 },
    { region: 'North Wales & Mersey', acceptedVol: 700, revenue: 35000, skippedVol: 90, skippedRevenue: 4500, skipRate: 11.4 },
    { region: 'South Wales', acceptedVol: 650, revenue: 32500, skippedVol: 80, skippedRevenue: 4000, skipRate: 10.9 },
    { region: 'North Scotland', acceptedVol: 2000, revenue: 100000, skippedVol: 500, skippedRevenue: 25000, skipRate: 20.0 },
    { region: 'South Scotland', acceptedVol: 1800, revenue: 90000, skippedVol: 400, skippedRevenue: 20000, skipRate: 18.2 },
    { region: 'Midlands', acceptedVol: 900, revenue: 45000, skippedVol: 170, skippedRevenue: 8500, skipRate: 15.9 },
    { region: 'Southern', acceptedVol: 1400, revenue: 70000, skippedVol: 110, skippedRevenue: 5500, skipRate: 7.3 },
];


const RegionalAssetBenchmark = () => {
    return (
        <PageContainer>
            <Title>Regional Asset Benchmark</Title>
            <FormContainer>
                <FormControl>
                    <Label htmlFor="date-range-start">Date Range Start</Label>
                    <Input type="date" id="date-range-start" defaultValue="2023-01-01" />
                </FormControl>
                <FormControl>
                    <Label htmlFor="date-range-end">Date Range End</Label>
                    <Input type="date" id="date-range-end" defaultValue="2023-01-31" />
                </FormControl>
                 <FormControl>
                    <Label htmlFor="asset-type">Asset Type</Label>
                    <Select id="asset-type">
                        <option>Offer (Generator)</option>
                        <option>Bid (Demand)</option>
                        <option>Both (Battery)</option>
                    </Select>
                </FormControl>
                 <FormControl>
                    <Label htmlFor="capacity">Capacity (MW)</Label>
                    <Input type="number" id="capacity" defaultValue="50" />
                </FormControl>
                 <FormControl>
                    <Label htmlFor="price">Price (£/MWh)</Label>
                    <Input type="number" id="price" defaultValue="50" />
                </FormControl>
                <Button>Run Benchmark</Button>
            </FormContainer>

            <ResultsTable>
                <thead>
                    <tr>
                        <Th>GSP Group Region</Th>
                        <Th>Est. Accepted Volume (MWh)</Th>
                        <Th>Est. Revenue (£)</Th>
                        <Th>Est. Skipped Volume (MWh)</Th>
                        <Th>Est. Skipped Revenue (£)</Th>
                        <Th>Skip Rate (%)</Th>
                    </tr>
                </thead>
                <tbody>
                    {benchmarkData.map(row => (
                        <Tr key={row.region}>
                            <Td>{row.region}</Td>
                            <Td>{row.acceptedVol.toLocaleString()}</Td>
                            <Td>{row.revenue.toLocaleString()}</Td>
                            <Td>{row.skippedVol.toLocaleString()}</Td>
                            <Td>{row.skippedRevenue.toLocaleString()}</Td>
                            <Td>{row.skipRate.toFixed(1)}</Td>
                        </Tr>
                    ))}
                </tbody>
            </ResultsTable>
        </PageContainer>
    );
};

export default RegionalAssetBenchmark; 