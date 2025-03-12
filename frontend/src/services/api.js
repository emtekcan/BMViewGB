import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const fetchImbalanceData = async (startDate, endDate) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/imbalances/`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching imbalance data:', error);
    throw error;
  }
};

export const fetchBMUMetadata = async (bmuId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/bmu/${bmuId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching BMU metadata:', error);
    throw error;
  }
}; 