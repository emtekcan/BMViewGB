import axios from 'axios';

// Use env var if defined, else fall back to localhost
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export const fetchDailyData = async (date) => {
  // Format date to DD-MM-YYYY
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');
  const year = date.year;
  const formattedDate = `${day}-${month}-${year}`;

  try {
    const response = await axios.get(`${API_BASE_URL}/daily-data/`, {
      params: { date: formattedDate }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching daily data:', error);
    throw error;
  }
};