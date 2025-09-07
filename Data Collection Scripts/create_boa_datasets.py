import datetime as dt
import re
import requests
import pandas as pd
from pandas import json_normalize

"""
This script is used to create the core BOA dataset from the Elexon BSC Insights Solution for BMViewGB
Run this script before running any other scripts in the Data Collection Scripts folder.
Ensure that the file 'TLFA-I001_NMS_2023-2024.csv' is in the same directory as this script.
This file is obtained from the Elexon BSC Data Portal Operational Data at https://www.elexonportal.co.uk/category/view/179
but cannot be redistributed in this repository due to Elexon's terms of use however the data is publicly available for free
directly from Elexon themselves, as explained in the paper and the readme, this is the 23/24 Transmission Loss Factor Mapping Statement data.
"""

# ---------------------------------------------------------------------
# Pull the bmunits data from the Elexon BSC Insights Solution API
# Forms the core of our BMU dataset
# ---------------------------------------------------------------------
# Build the request
BASE_URL  = "https://data.elexon.co.uk/bmrs/api/v1"   # Insights Solution base
ENDPOINT  = "/reference/bmunits/all"                  # specific path
URL       = f"{BASE_URL}{ENDPOINT}"

# Ask explicitly for JSON so the response is an array of objects
headers   = {"Accept": "application/json"}

# Call the API
resp = requests.get(URL, headers=headers, timeout=30)
resp.raise_for_status()          # will raise if the call failed

# Parse straight into a DataFrame
bm_units = resp.json()
df       = pd.DataFrame(bm_units)


# ---------------------------------------------------------------------
# Functions to fetch BOA data from the Elexon BSC Insights Solution API
# BOAV endpoint
# ---------------------------------------------------------------------
API_ROOT = "https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/acceptance/volumes/all"

PARAMS   = {"format": "json"}
BID_OFFER = ("bid", "offer")

def to_snake(name: str) -> str:
    """Convert CamelCase / mixedCase / kebab-case to snake_case."""
    name = re.sub(r"([a-z\d])([A-Z])", r"\1_\2", name)  # split camelCase
    name = re.sub(r"[\s\-/]", "_", name)                # spaces & hyphens → _
    return re.sub(r"__+", "_", name).lower()

def fetch_one(date: str, side: str) -> list[dict]:
    """Return the raw data list for one (date, side) call, else empty list."""
    url = f"{API_ROOT}/{side}/{date}"
    try:
        r = requests.get(url, params=PARAMS, timeout=30)
        r.raise_for_status()
        payload = r.json()
        rows = payload.get("data", [])
        # for row in rows:
        #     row["is_bid"] = 1 if side == "bid" else 0
        return rows
    except Exception as exc:                               # noqa: BLE001
        print(f"warning: {date} {side.upper()} failed - {exc}")
        return []

def get_boa_dataframe(start: str, end: str) -> pd.DataFrame:
    start_dt, end_dt = map(pd.to_datetime, (start, end))
    all_rows: list[dict] = []

    curr = start_dt
    while curr <= end_dt:
        d_str = curr.strftime("%Y-%m-%d")
        for side in BID_OFFER:
            all_rows.extend(fetch_one(d_str, side))
        curr += dt.timedelta(days=1)

    # Flatten & snake-case
    df = json_normalize(all_rows, sep="_")
    df.columns = [to_snake(c) for c in df.columns]

    df["settlement_date"] = pd.to_datetime(df["settlement_date"])
    df["created_date_time"] = pd.to_datetime(df["created_date_time"])
    df["start_time"] = pd.to_datetime(df["start_time"])
    df["settlement_period"] = pd.to_numeric(df["settlement_period"], downcast="integer")
    df["total_volume_accepted"] = pd.to_numeric(df["total_volume_accepted"])

    return df

# ---------------------------------------------------------------------
# Function to process the raw data from the API to remove redundant
# columns and manually fill in missing BMU information
# ---------------------------------------------------------------------
def process_raw_boa_data(boa_df: pd.DataFrame) -> pd.DataFrame:
    boa_df = boa_df[boa_df['total_volume_accepted'] != 0]

    # ---------------------------------------------------------------------
    # Prepare datasets used to fill in the missing GSP group 
    # information from the core data
    # ---------------------------------------------------------------------
    # Prepare zone to gsp group id mapping and description
    zone_data = {
        'zone': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        'gsp_group_id': ['_A', '_B', '_C', '_D', '_E', '_F', '_G', '_H', '_J', '_K', '_L', '_M', '_N', '_P'],
        'gsp_group_description': [
            'Eastern',
            'East Midlands', 
            'London',
            'Merseyside & North Wales',
            'Midlands',
            'Northern',
            'North Western',
            'Southern',
            'South Eastern',
            'South Wales',
            'South Western',
            'Yorkshire',
            'South of Scotland',
            'North of Scotland'
        ]
    }
    zone_df = pd.DataFrame(zone_data)

    # Load the Transmission Loss Factor Mapping Statement data 
    # obtained from Elexon BSC Data Portal Operational Data 
    # https://www.elexonportal.co.uk/category/view/179 
    tlf_df = pd.read_csv('TLFA-I001_NMS_2023-2024.csv')

    # Merge the zonal legend with the TLF data to get the GSP group ids since tlf data has info for zone not gsp group
    tlf_df = tlf_df.merge(
        zone_df[['zone', 'gsp_group_id']], 
        left_on='col_zone', 
        right_on='zone', 
        how='left'
    ).drop('zone', axis=1)

    # Merge the BOA data with TLF data to fill in missing GSP group information
    boa_df = boa_df.merge(
        tlf_df[['col_bmu', 'gsp_group_id']], 
        left_on='bm_unit', 
        right_on='col_bmu', 
        how='left'
    )

    # Manually fill information for some BMUs that were missing in both bmunits and tlf data
    # but exist in the BOAV data because they historically had BOAs issued in the BM
    # the information here was collected from various sources online by googling the codes and bm keywords,
    # todo: find the sources again add them to the comments
    mapping = df.set_index('nationalGridBmUnit')['gspGroupId'].to_dict()

    mask = boa_df['gsp_group_id'].isna()
    boa_df.loc[mask, 'gsp_group_id'] = boa_df.loc[mask, 'national_grid_bm_unit'].map(mapping)

    mask = boa_df['national_grid_bm_unit'] == 'PETDG-1'
    boa_df.loc[mask, 'bm_unit'] = 'E_PETEM3'
    boa_df.loc[mask, 'gsp_group_id'] = '_A'

    mask = boa_df['national_grid_bm_unit'] == 'AG-CBS04B'
    boa_df.loc[mask, 'bm_unit'] = 'V__BCEND004'
    boa_df.loc[mask, 'gsp_group_id'] = '_B'

    mask = boa_df['national_grid_bm_unit'] == 'LARKB-1'
    boa_df.loc[mask, 'bm_unit'] = 'T_LARKB-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_L'

    mask = boa_df['national_grid_bm_unit'] == 'LKSDB-1'
    boa_df.loc[mask, 'bm_unit'] = 'T_LKSDB-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_M'

    mask = boa_df['national_grid_bm_unit'] == 'BLHLB-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_P'

    mask = boa_df['national_grid_bm_unit'] == 'BLHLB-2'
    boa_df.loc[mask, 'gsp_group_id'] = '_P'

    mask = boa_df['national_grid_bm_unit'] == 'BLHLB-3'
    boa_df.loc[mask, 'gsp_group_id'] = '_P'

    mask = boa_df['national_grid_bm_unit'] == 'BLHLB-4'
    boa_df.loc[mask, 'gsp_group_id'] = '_P'

    mask = boa_df['national_grid_bm_unit'] == 'TYLNB-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_A'

    mask = boa_df['national_grid_bm_unit'] == 'OCHLB-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_E'

    mask = boa_df['national_grid_bm_unit'] == 'LIMKW-1'
    boa_df.loc[mask, 'gsp_group_id'] = '_P'
    return boa_df


# ---------------------------------------------------------------------
# Pull the BOA data
# ---------------------------------------------------------------------
# Systems with 32GB+ of RAM can uncomment the code below to pull a large range of BOA data in one go
# START_DATE   = "2021-01-01"
# END_DATE     = "2025-08-31"
# boa_df = get_boa_dataframe(START_DATE, END_DATE)
# boa_df.to_csv("boadf_raw.csv", index=False)

# However, we break the data down by year and pull one at a time to avoid memory issues
# 2021-2024
for year in range(2021, 2024):
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    boa_df = get_boa_dataframe(start_date, end_date)
    boa_df.to_csv(f"{year}boadf_raw.csv", index=False) # store raw data from API as is
    boa_df = process_raw_boa_data(boa_df) # process the data to fill in missing geospatial information
    boa_df.to_csv(f"{year}boadf_processed.csv", index=False)
# 2025
boa_df = get_boa_dataframe("2025-01-01", "2025-08-31")
boa_df.to_csv("2025boadf_raw.csv", index=False)
boa_df = process_raw_boa_data(boa_df)
boa_df.to_csv("2025boadf_processed.csv", index=False)

