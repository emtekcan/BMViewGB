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

export const fetchAvailableVariables = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/available-variables/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching available variables:", error);
    throw error;
  }
};

export const fetchTimeSeries = async ({ startDate, endDate, variables }) => {
  const { data } = await axios.get(`${API_BASE_URL}/time-series/`, {
    params: {
      start_date: startDate,
      end_date: endDate,
      variables: variables.join(","),
    },
  });
  return data;
};

export const downloadAsCsv = (rows, filename = "timeseries.csv") => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};