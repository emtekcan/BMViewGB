from django.http import JsonResponse
from datetime import datetime
from .services.data_processor import DataProcessor
from .services.asset_benchmark import AssetBenchmark
import pandas as pd
import os

data_processor = DataProcessor()

def daily_data(request):
    date_str = request.GET.get('date', None)
    if not date_str:
        return JsonResponse({"error": "Date parameter is required."}, status=400)
    
    try:
        date = datetime.strptime(date_str, '%d-%m-%Y')
    except ValueError:
        return JsonResponse({"error": "Invalid date format. Use DD-MM-YYYY."}, status=400)
        
    data = data_processor.get_daily_data(date)
    
    if data is None:
        return JsonResponse({"error": "Data not available for the selected date."}, status=404)
        
    return JsonResponse(data)

def time_series_data(request):
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    variables_str = request.GET.get('variables')

    if not all([start_date_str, end_date_str, variables_str]):
        return JsonResponse({'error': 'start_date, end_date, and variables are required'}, status=400)

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        variables = variables_str.split(',')
    except ValueError:
        return JsonResponse({'error': 'Invalid date or variable format'}, status=400)

    data_processor = DataProcessor()
    all_data = []
    for year in range(start_date.year, end_date.year + 1):
        core_file = os.path.join(data_processor.core_data_dir, f'core_data_{year}.csv')
        if os.path.exists(core_file):
            df = pd.read_csv(core_file)
            all_data.append(df)

    if not all_data:
        return JsonResponse({'error': 'No data available for the selected date range'}, status=404)

    full_df = pd.concat(all_data, ignore_index=True)
    full_df['settlement_date'] = pd.to_datetime(full_df['settlement_date'])

    mask = (full_df['settlement_date'] >= start_date) & (full_df['settlement_date'] <= end_date)
    filtered_df = full_df.loc[mask]

    if filtered_df.empty:
        return JsonResponse({'error': 'No data available for the selected date range'}, status=404)

    # Aggregate nationally
    group_by_cols = ['settlement_date', 'settlement_period']
    
    numeric_vars = [v for v in variables if v in filtered_df.columns and pd.api.types.is_numeric_dtype(filtered_df[v])]
    
    agg_dict = {var: 'sum' for var in numeric_vars}

    national_df = filtered_df.groupby(group_by_cols).agg(agg_dict).reset_index()

    # Ensure all requested variables are in the final df
    final_vars = group_by_cols + numeric_vars
    response_df = national_df[[col for col in final_vars if col in variables or col in group_by_cols]]

    return JsonResponse(response_df.to_dict('records'), safe=False)

def available_variables(request):
    # Provide a list of plottable variables to the frontend
    # This is based on the columns in the core_data files
    plottable_columns = [
        'net_volume',
        'boas_count',
        'bids_count',
        'offers_count',
        'system_volume',
        'energy_volume',
        'balancing_cost',
    ]
    time_columns = [
        'settlement_date',
        'settlement_period'
    ]
    return JsonResponse({'time': time_columns, 'numeric': plottable_columns}, safe=False)

def asset_benchmark_data(request):
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    asset_type = request.GET.get('asset_type')
    capacity_mw = request.GET.get('capacity_mw')
    price_bid = request.GET.get('price_bid')
    price_offer = request.GET.get('price_offer')

    if not all([start_date_str, end_date_str, asset_type, capacity_mw]):
        return JsonResponse({'error': 'Missing required parameters'}, status=400)

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        capacity_mw_float = float(capacity_mw)
        price_bid_float = float(price_bid) if price_bid else None
        price_offer_float = float(price_offer) if price_offer else None
    except (ValueError, TypeError):
        return JsonResponse({'error': 'Invalid parameter format'}, status=400)

    # Load all processed (not core) data for the simulation
    all_data = []
    for year in range(start_date.year, end_date.year + 1):
        processed_file = os.path.join(data_processor.processed_dir, f'{year}boadf_processed.csv')
        if os.path.exists(processed_file):
            df = pd.read_csv(processed_file)
            all_data.append(df)
    
    if not all_data:
        return JsonResponse({'error': 'No data available for the selected date range'}, status=404)

    full_df = pd.concat(all_data, ignore_index=True)
    full_df['settlement_date'] = pd.to_datetime(full_df['settlement_date'])
    mask = (full_df['settlement_date'] >= start_date) & (full_df['settlement_date'] <= end_date)
    filtered_df = full_df.loc[mask]

    if filtered_df.empty:
        return JsonResponse({'error': 'No data available for the selected date range'}, status=404)

    benchmark = AssetBenchmark(filtered_df)
    results = benchmark.run_simulation(asset_type, capacity_mw_float, price_bid_float, price_offer_float)

    return JsonResponse(results, safe=False)