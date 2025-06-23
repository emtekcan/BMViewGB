import pandas as pd
import json
from pathlib import Path
import numpy as np
import os
from collections import Counter

class DataProcessor:
    def __init__(self, data_dir=None):
        # Determine the correct data directory path
        if data_dir is None:
            # Get the directory where this file is located
            current_file = Path(__file__).resolve()
            # Navigate to backend/data from api/services/
            backend_dir = current_file.parent.parent.parent
            data_dir = os.path.join(backend_dir, 'data')
        
        self.data_dir = data_dir
        self.processed_dir = self.data_dir
        self.core_data_dir = os.path.join(self.data_dir, 'core')
        os.makedirs(self.core_data_dir, exist_ok=True)

    def create_core_data(self, year):
        processed_file = os.path.join(self.processed_dir, f'{year}boadf_processed.csv')
        core_file = os.path.join(self.core_data_dir, f'core_data_{year}.csv')
        
        if os.path.exists(core_file):
            print(f'Core data for {year} already exists.')
            return

        if not os.path.exists(processed_file):
            print(f'Processed data for {year} not found.')
            return

        print(f'Creating core data for {year}...')
        df = pd.read_csv(processed_file)

        df['bids_count'] = np.where(df['total_volume_accepted'] < 0, 1, 0)
        df['offers_count'] = np.where(df['total_volume_accepted'] > 0, 1, 0)

        # Separate data for generation (offers) and consumption (bids)
        offers_df = df[df['total_volume_accepted'] > 0]
        bids_df = df[df['total_volume_accepted'] < 0]

        # Calculate generation and consumption tech mixes
        gen_mix_df = offers_df.groupby(['settlement_date', 'settlement_period', 'gsp_group_id', 'bmu_fuel_type'])['total_volume_accepted'].sum().unstack(fill_value=0)
        con_mix_df = bids_df.groupby(['settlement_date', 'settlement_period', 'gsp_group_id', 'bmu_fuel_type'])['total_volume_accepted'].sum().unstack(fill_value=0)

        gen_mix_json = gen_mix_df.apply(lambda x: x.to_dict(), axis=1)
        con_mix_json = con_mix_df.apply(lambda x: x.to_dict(), axis=1)

        agg_funcs = {
            'total_volume_accepted': 'sum',
            'acceptance_id': pd.Series.nunique,
            'bids_count': 'sum',
            'offers_count': 'sum',
            'balancing_cost': 'sum',
        }
        
        core_data = df.groupby(['settlement_date', 'settlement_period', 'gsp_group_id']).agg(agg_funcs)
        
        system_volume = df[df['system_operator_flag'] == 1].groupby(['settlement_date', 'settlement_period', 'gsp_group_id'])['total_volume_accepted'].sum()
        core_data = core_data.join(system_volume.rename('system_volume'))
        core_data['system_volume'].fillna(0, inplace=True)

        core_data.rename(columns={
            'total_volume_accepted': 'net_volume',
            'acceptance_id': 'boas_count'
        }, inplace=True)
        
        core_data['energy_volume'] = core_data['net_volume'] - core_data['system_volume']
        
        core_data = core_data.join(gen_mix_json.rename('generation_mix'))
        core_data = core_data.join(con_mix_json.rename('consumption_mix'))

        core_data['generation_mix'].fillna({}, inplace=True)
        core_data['consumption_mix'].fillna({}, inplace=True)

        core_data.reset_index(inplace=True)
        core_data.to_csv(core_file, index=False)
        print(f'Finished creating core data for {year}.')

    def create_all_core_data(self):
        for year in range(2021, 2026):
            self.create_core_data(year)

    def get_daily_data(self, date):
        year = date.year
        core_file = os.path.join(self.core_data_dir, f'core_data_{year}.csv')
        if not os.path.exists(core_file):
            self.create_core_data(year)

        if not os.path.exists(core_file):
            return None
            
        df = pd.read_csv(core_file)
        date_str = date.strftime('%Y-%m-%d')
        daily_data = df[df['settlement_date'] == date_str].copy()
        
        if daily_data.empty:
            return {'day_type': 'N', 'settlement_period': [], 'hourly': [], 'daily': []}

        max_sp = daily_data['settlement_period'].max()
        if max_sp == 48:
            day_type = 'N'
        elif max_sp > 48:
            day_type = 'L'
        else:
            day_type = 'S'
        
        # Convert tech_mix from string representation of dict to dict first
        for col in ['generation_mix', 'consumption_mix']:
            daily_data[col] = daily_data[col].apply(lambda x: json.loads(x.replace("'", "\"")) if isinstance(x, str) and pd.notna(x) and x not in ('{}', 'nan') else {})

        # Aggregations
        daily_data_sp = daily_data.copy()
        daily_data_sp['hour'] = (daily_data_sp['settlement_period'] - 1) // 2
        
        daily_data_hr = self.aggregate_to_hourly(daily_data_sp)
        daily_data_day = self.aggregate_to_daily(daily_data_sp)

        # Convert DataFrames to lists of dictionaries, handling the mix columns properly
        def df_to_json_serializable(df):
            records = []
            for _, row in df.iterrows():
                record = row.to_dict()
                # Handle NaN and infinity values
                for key, value in record.items():
                    if pd.isna(value) or (isinstance(value, float) and (np.isinf(value) or np.isnan(value))):
                        if key in ['generation_mix', 'consumption_mix']:
                            record[key] = {}
                        else:
                            record[key] = None
                    elif key in ['generation_mix', 'consumption_mix']:
                        # Ensure mix fields are properly serialized
                        if not isinstance(value, dict):
                            record[key] = {}
                records.append(record)
            return records

        return {
            'day_type': day_type,
            'settlement_period': df_to_json_serializable(daily_data_sp),
            'hourly': df_to_json_serializable(daily_data_hr),
            'daily': df_to_json_serializable(daily_data_day),
        }

    def _aggregate_mix(self, series_of_dicts):
        total = Counter()
        for d in series_of_dicts:
            if isinstance(d, dict):
                total.update(d)
        return dict(total)

    def aggregate_to_hourly(self, df):
        # Aggregate numeric columns
        numeric_aggs = {
            'net_volume': 'sum',
            'boas_count': 'sum',
            'bids_count': 'sum',
            'offers_count': 'sum',
            'system_volume': 'sum',
            'energy_volume': 'sum',
            'balancing_cost': 'sum'
        }
        
        all_aggs = {
            **numeric_aggs,
            'generation_mix': self._aggregate_mix,
            'consumption_mix': self._aggregate_mix
        }
        
        # Group by settlement_date, gsp_group_id, hour
        df_hourly = df.groupby(['settlement_date', 'gsp_group_id', 'hour']).agg(all_aggs).reset_index()
        
        return df_hourly

    def aggregate_to_daily(self, df):
        # Aggregate numeric columns
        numeric_aggs = {
            'net_volume': 'sum',
            'boas_count': 'sum',
            'bids_count': 'sum',
            'offers_count': 'sum',
            'system_volume': 'sum',
            'energy_volume': 'sum',
            'balancing_cost': 'sum'
        }

        all_aggs = {
            **numeric_aggs,
            'generation_mix': self._aggregate_mix,
            'consumption_mix': self._aggregate_mix
        }

        # Group by settlement_date and gsp_group_id
        df_daily = df.groupby(['settlement_date', 'gsp_group_id']).agg(all_aggs).reset_index()
        
        return df_daily