from flask import Flask, request, jsonify
import pandas as pd
import os
from flask_cors import CORS
import plotly.express as px
import plotly.io as pio
import json

app = Flask(__name__)
CORS(app)

# Global variables to store the dataframes
df = None
vwap_df = None

def load_data():
    global df, vwap_df
    try:
        # Load main dataframe
        csv_path = os.path.join(os.path.dirname(__file__), 'data', 'grouped_boas_df.csv')
        print(f"Loading main data from: {csv_path}")
        df = pd.read_csv(csv_path)
        
        if 'ACCEPT DATE' in df.columns:
            df['ACCEPT DATE'] = pd.to_datetime(df['ACCEPT DATE'])
            
        print(f"Main data loaded successfully. Shape: {df.shape}")
        
        # Load VWAP dataframe
        vwap_path = os.path.join(os.path.dirname(__file__), 'data', 'vwap_df.csv')
        print(f"Loading VWAP data from: {vwap_path}")
        vwap_df = pd.read_csv(vwap_path)
        
        # Convert date and time columns
        if 'date_str' in vwap_df.columns:
            vwap_df['date_str'] = vwap_df['date_str'].astype(str)
        
        if 'ACCEPT TIME' in vwap_df.columns:
            vwap_df['ACCEPT TIME'] = pd.to_datetime(vwap_df['ACCEPT TIME'])
            
        print(f"VWAP data loaded successfully. Shape: {vwap_df.shape}")
        
    except Exception as e:
        print(f"Error loading data: {e}")

# Load data when the module is imported
load_data()

@app.route('/get-imbalance', methods=['POST'])
def get_imbalance():
    global df
    
    # If df is None, try loading it again
    if df is None:
        load_data()
        if df is None:
            return jsonify({"error": "Failed to load data"}), 500
    
    data = request.json
    year = int(data.get('year'))
    month = int(data.get('month'))
    day = int(data.get('day'))
    settlement_period = int(data.get('settlementPeriod'))
    
    try:
        # Filter the dataframe for the selected date and settlement period
        date_str = f"{year}-{month:02d}-{day:02d}"
        print(f"Looking for date: {date_str}, settlement period: {settlement_period}")
        
        filtered_df = df[
            (df['ACCEPT DATE'].dt.strftime('%Y-%m-%d') == date_str) & 
            (df['MAIN SP'] == settlement_period)
        ]
        
        print(f"Found {len(filtered_df)} records matching criteria")
        
        # Create a dictionary with GSP IDs as keys and net volumes as values
        result = {}
        
        # Process each GSP group
        gsp_groups = ['_A', '_B', '_C', '_D', '_E', '_F', '_G', '_H', '_J', '_K', '_L', '_M', '_N', '_P']
        
        for gsp_id in gsp_groups:
            gsp_data = filtered_df[filtered_df['gsp group id'] == gsp_id]
            
            if not gsp_data.empty:
                # Sum the net imbalance volume for this GSP
                net_vol = gsp_data['NET VOL (MWh)'].sum()
                result[gsp_id] = float(net_vol)
                print(f"GSP {gsp_id}: {net_vol}")
            else:
                # No data for this GSP in the selected period
                result[gsp_id] = 0
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error processing data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/get-vwap', methods=['POST'])
def get_vwap():
    global vwap_df
    
    # If vwap_df is None, try loading it again
    if vwap_df is None:
        load_data()
        if vwap_df is None:
            return jsonify({"error": "Failed to load VWAP data"}), 500
    
    data = request.json
    year = int(data.get('year'))
    month = int(data.get('month'))
    day = int(data.get('day'))
    settlement_period = int(data.get('settlementPeriod'))
    gsp_id = data.get('gspId')
    
    try:
        # Format date string
        date_str = f"{year}-{month:02d}-{day:02d}"
        print(f"Looking for VWAP data: date={date_str}, SP={settlement_period}, GSP={gsp_id}")
        
        # Filter the dataframe
        subset = vwap_df[
            (vwap_df['date_str'] == date_str) &
            (vwap_df['MAIN SP'] == settlement_period) &
            (vwap_df['gsp group id'] == gsp_id)
        ].sort_values('ACCEPT TIME')
        
        print(f"Found {len(subset)} VWAP records")
        
        if subset.empty:
            return jsonify({"error": f"No VWAP data found for {gsp_id} on {date_str}, SP {settlement_period}"}), 404
        
        # Convert to JSON-serializable format
        result = {
            'times': subset['ACCEPT TIME'].dt.strftime('%H:%M:%S').tolist(),
            'vwap': subset['running_vwap'].tolist(),
            'gsp_id': gsp_id,
            'date': date_str,
            'settlement_period': settlement_period
        }
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error processing VWAP data: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple endpoint to check if the API is running"""
    return jsonify({
        "status": "ok", 
        "data_loaded": df is not None,
        "vwap_data_loaded": vwap_df is not None
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 