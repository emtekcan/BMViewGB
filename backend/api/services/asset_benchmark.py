import pandas as pd
import numpy as np

class AssetBenchmark:
    def __init__(self, all_data_df):
        self.df = all_data_df.copy()
        # Ensure price is numeric
        self.df['accepted_price'] = pd.to_numeric(self.df['accepted_price'], errors='coerce')
        self.df.dropna(subset=['accepted_price'], inplace=True)

    def run_simulation(self, asset_type, capacity_mw, price_bid, price_offer):
        # This is a simplified simulation based on the provided logic
        
        regional_results = {}
        gsp_groups = self.df['gsp_group_id'].unique()

        for gsp in gsp_groups:
            regional_df = self.df[self.df['gsp_group_id'] == gsp]
            
            total_accepted_vol = 0
            total_skipped_vol = 0
            
            # Group by each settlement period to run the logic
            for (date, period), group in regional_df.groupby(['settlement_date', 'settlement_period']):
                
                # Offer simulation (asset sells energy)
                if asset_type in ['offer', 'both'] and price_offer is not None:
                    offers = group[group['total_volume_accepted'] > 0].copy()
                    imbalance_req = offers['total_volume_accepted'].sum()
                    
                    if imbalance_req > 0:
                        offers['is_hypothetical'] = False
                        asset_row = pd.DataFrame([{'accepted_price': price_offer, 'total_volume_accepted': capacity_mw / 2, 'system_operator_flag': 0, 'is_hypothetical': True}])
                        merit_stack = pd.concat([offers[['accepted_price', 'total_volume_accepted', 'system_operator_flag', 'is_hypothetical']], asset_row], ignore_index=True)
                        merit_stack.sort_values(by='accepted_price', ascending=True, inplace=True)
                        
                        merit_stack['cumulative_vol'] = merit_stack['total_volume_accepted'].cumsum()
                        in_merit_stack = merit_stack[merit_stack['cumulative_vol'] <= (imbalance_req + 0.0001)]
                        
                        if in_merit_stack['is_hypothetical'].any():
                            energy_req = offers[offers['system_operator_flag'] == 0]['total_volume_accepted'].sum()
                            
                            asset_in_energy_stack = price_offer <= in_merit_stack[~in_merit_stack['is_hypothetical'] & (in_merit_stack['system_operator_flag'] == 0)]['accepted_price'].max()
                            
                            if pd.isna(asset_in_energy_stack) or asset_in_energy_stack:
                                total_accepted_vol += (capacity_mw / 2)
                            else:
                                total_skipped_vol += (capacity_mw / 2)

                # Bid simulation (asset buys energy)
                if asset_type in ['bid', 'both'] and price_bid is not None:
                    bids = group[group['total_volume_accepted'] < 0].copy()
                    bids['total_volume_accepted'] = bids['total_volume_accepted'].abs() # Work with positive volumes
                    imbalance_req = bids['total_volume_accepted'].sum()

                    if imbalance_req > 0:
                        bids['is_hypothetical'] = False
                        asset_row = pd.DataFrame([{'accepted_price': price_bid, 'total_volume_accepted': capacity_mw / 2, 'system_operator_flag': 0, 'is_hypothetical': True}])
                        merit_stack = pd.concat([bids[['accepted_price', 'total_volume_accepted', 'system_operator_flag', 'is_hypothetical']], asset_row], ignore_index=True)
                        merit_stack.sort_values(by='accepted_price', ascending=False, inplace=True) # Descending for bids
                        
                        merit_stack['cumulative_vol'] = merit_stack['total_volume_accepted'].cumsum()
                        in_merit_stack = merit_stack[merit_stack['cumulative_vol'] <= (imbalance_req + 0.0001)]

                        if in_merit_stack['is_hypothetical'].any():
                            asset_in_energy_stack = price_bid >= in_merit_stack[~in_merit_stack['is_hypothetical'] & (in_merit_stack['system_operator_flag'] == 0)]['accepted_price'].min()

                            if pd.isna(asset_in_energy_stack) or asset_in_energy_stack:
                                total_accepted_vol += (capacity_mw / 2)
                            else:
                                total_skipped_vol += (capacity_mw / 2)
            
            # Calculate final metrics for the GSP region
            skip_rate = (total_skipped_vol / (total_accepted_vol + total_skipped_vol)) * 100 if (total_accepted_vol + total_skipped_vol) > 0 else 0
            
            regional_results[gsp] = {
                'gsp_group_id': gsp,
                'accepted_volume_mwh': total_accepted_vol,
                'skipped_volume_mwh': total_skipped_vol,
                'estimated_revenue': total_accepted_vol * (price_offer if asset_type == 'offer' else (price_bid if asset_type == 'bid' else ((price_offer + price_bid or 0)/2) )), # Simplified revenue
                'skip_rate_percent': skip_rate
            }

        return list(regional_results.values()) 