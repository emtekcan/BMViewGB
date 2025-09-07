import os, json, time, math, pathlib, typing as t
import pandas as pd
import numpy as np
import requests
from collections import defaultdict
from datetime import datetime, date
from tqdm import tqdm

"""
- Pulls price slices from BMRS ISPSTACK endpoint:
https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/stack/all/{bid|offer}/{YYYY-MM-DD}/{SP}?format=json
- Builds volume-weighted average price per (bmu_unit, acceptanceId)
    (since every unique (bmu_unit, acceptanceId) pair can be distributed among settlement periods)
- Maps onto processed CSVs as accepted_price by (bm_unit OR national_grid_bm_unit, acceptance_id)
- Computes balancing_cost = total_volume_accepted * accepted_price (sign by volume)
-Notes:
 We only call ISPSTACK for (date, settlement period, side) pairs that actually appear
 in the target CSV(s) and within the requested date window
 Caches each JSON API response in cache_ispstack/ so wipe cache_ispstack/ to re-fetch API data on repeat runs
"""

def wipe_columns_with_nan(csv_path: str, col1: str, col2: str):
    df = pd.read_csv(csv_path)
    df[[col1, col2]] = pd.NA
    df.to_csv(csv_path, index=False)

API_ROOT = "https://data.elexon.co.uk/bmrs/api/v1/balancing/settlement/stack/all"
SESSION = requests.Session()
SESSION.headers.update({"Accept": "application/json"})
CACHE_DIR = pathlib.Path("cache_ispstack")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

def _cache_path(d: str, sp: int, side: str) -> pathlib.Path:
    return CACHE_DIR / f"{d}_SP{sp:02d}_{side}.json"

def _load_cache(d: str, sp: int, side: str):
    p = _cache_path(d, sp, side)
    if p.exists():
        try:
            with open(p, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def _save_cache(d: str, sp: int, side: str, payload):
    p = _cache_path(d, sp, side)
    try:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(payload, f)
    except Exception:
        pass

def _get_ispstack(d: str, sp: int, side: str, retries: int = 4, base_delay: float = 0.5):
    """
    Fetch one ISPSTACK page for a given (date, settlement period, side).
    Returns parsed JSON (dict with 'data' list) or {} if none.
    """
    # try cache
    cached = _load_cache(d, sp, side)
    if cached is not None:
        return cached

    url = f"{API_ROOT}/{side}/{d}/{sp}?format=json"
    last_exc = None
    for i in range(retries):
        try:
            r = SESSION.get(url, timeout=60)
            if r.status_code == 200:
                payload = r.json()
                _save_cache(d, sp, side, payload)
                # polite pause to be nice to the API
                time.sleep(0.15)
                return payload
            # 429 / 5xx backoff
            if r.status_code in (429, 500, 502, 503, 504):
                delay = base_delay * (2 ** i)
                time.sleep(delay)
            else:
                # cache empty result to avoid hammering
                _save_cache(d, sp, side, {})
                return {}
        except requests.RequestException as exc:
            last_exc = exc
            delay = base_delay * (2 ** i)
            time.sleep(delay)
    # If we get here, give up for this (d, sp, side)
    if last_exc:
        print(f"warning: {d} SP{sp} {side.upper()} fetch failed: {last_exc}")
    _save_cache(d, sp, side, {})
    return {}

def _normalize_date_series(s: pd.Series) -> pd.Series:
    # Handles object/str/datetime -> YYYY-MM-DD string
    if np.issubdtype(s.dtype, np.datetime64):
        return s.dt.strftime("%Y-%m-%d")
    # try parse
    return pd.to_datetime(s).dt.strftime("%Y-%m-%d")

def _side_from_volume(v: float) -> str:
    # Negative net volume => bid, positive => offer; zero is ambiguous (skip)
    if pd.isna(v):
        return "unknown"
    if v < 0:
        return "bid"
    if v > 0:
        return "offer"
    return "unknown"

def _collect_needed_calls(df: pd.DataFrame, start_date: t.Optional[str], end_date: t.Optional[str]) -> t.Dict[tuple, t.Set[str]]:
    """
    Returns a mapping: (YYYY-MM-DD, SP) -> set of sides {'bid','offer'} actually present in the CSV rows.
    Limiting API calls to exactly what we need naturally handles 46/48/50 SP days.
    """
    # dates as YYYY-MM-DD strings
    df = df.copy()
    df["__d"] = _normalize_date_series(df["settlement_date"])
    if start_date:
        df = df[df["__d"] >= start_date]
    if end_date:
        df = df[df["__d"] <= end_date]

    # derive sides per row from sign of total_volume_accepted
    df["__side"] = df["total_volume_accepted"].apply(_side_from_volume)
    df = df[df["__side"] != "unknown"]

    calls: t.Dict[tuple, t.Set[str]] = defaultdict(set)
    for d, sp, side in df[["__d", "settlement_period", "__side"]].itertuples(index=False, name=None):
        calls[(d, int(sp))].add(side)
    return calls

def _build_price_map_from_payloads(payloads: t.List[dict],
                                   price_field: str = "finalPrice",
                                   weight_field: str = "volume") -> t.Dict[tuple, float]:
    """
    Build a { (id, acceptanceId) -> volume-weighted avg price } from a list of ISPSTACK payloads.
    We use |volume| as weights by default, so signs don't cancel and 'average' reflects price over accepted energy magnitude.
    """
    accum_weight = defaultdict(float)
    accum_value  = defaultdict(float)

    for payload in payloads:
        if not payload or "data" not in payload or not isinstance(payload["data"], list):
            continue
        for row in payload["data"]:
            try:
                bmu_id = row.get("id")
                acc_id = row.get("acceptanceId")
                price  = row.get(price_field)
                vol    = row.get(weight_field)
                if bmu_id is None or acc_id is None or price is None or vol is None:
                    continue
                w = abs(float(vol))
                p = float(price)
                if w == 0:
                    continue
                key = (str(bmu_id), int(acc_id))
                accum_weight[key] += w
                accum_value[key]  += p * w
            except Exception:
                continue

    price_map: t.Dict[tuple, float] = {}
    for key, w in accum_weight.items():
        if w > 0:
            price_map[key] = accum_value[key] / w
    return price_map

def _map_prices_onto_csv(df: pd.DataFrame, price_map: t.Dict[tuple, float]) -> pd.DataFrame:
    """
    Update df['accepted_price'] using (bm_unit OR national_grid_bm_unit, acceptance_id) -> price_map.
    Leaves unmapped rows as NaN.
    """
    if "accepted_price" not in df.columns:
        df["accepted_price"] = np.nan

    # Try primary match on bm_unit/id
    mask_unmapped = df["accepted_price"].isna()
    if "bm_unit" in df.columns:
        df.loc[mask_unmapped, "accepted_price"] = df.loc[mask_unmapped, ["bm_unit", "acceptance_id"]].apply(
            lambda r: price_map.get((str(r["bm_unit"]), int(r["acceptance_id"]))) if pd.notna(r["bm_unit"]) else np.nan, axis=1
        )
        mask_unmapped = df["accepted_price"].isna()

    # Fallback match on national_grid_bm_unit/id
    if "national_grid_bm_unit" in df.columns:
        df.loc[mask_unmapped, "accepted_price"] = df.loc[mask_unmapped, ["national_grid_bm_unit", "acceptance_id"]].apply(
            lambda r: price_map.get((str(r["national_grid_bm_unit"]), int(r["acceptance_id"]))) if pd.notna(r["national_grid_bm_unit"]) else np.nan, axis=1)

    return df

def augment_csv_with_ispstack_prices(
    csv_path: str,
    start_date: t.Optional[str] = None,   # 'YYYY-MM-DD' inclusive
    end_date: t.Optional[str] = None,     # 'YYYY-MM-DD' inclusive
    price_field: str = "finalPrice",      # or 'originalPrice'
    weight_field: str = "volume",         # weight by |volume|
    overwrite_accepts_outside_range: bool = False,
) -> None:
    """
    Read processed CSV, fetch ISPSTACK data for required (date, SP, side) pairs,
    compute accepted_price (VWAP by 'weight_field', default volume), and balancing_cost.

    If start_date/end_date are None, defaults to the whole year seen in the CSV.
    """
    print(f"\n=== Processing {csv_path} ===")
    if not os.path.exists(csv_path):
        print("  file not found")
        return

    df = pd.read_csv(csv_path)

    # Ensure minimal columns exist
    required = {"settlement_date", "settlement_period", "total_volume_accepted", "acceptance_id"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{csv_path} missing required columns: {missing}")

    # Derive default year bounds if not provided
    dates_norm = _normalize_date_series(df["settlement_date"])
    if start_date is None or end_date is None:
        # entire year of the CSV (min->max)
        min_d = dates_norm.min()
        max_d = dates_norm.max()
        if start_date is None: start_date = min_d
        if end_date   is None: end_date   = max_d

    print(f"  Date range: {start_date} → {end_date} (inclusive)  | price_field={price_field}")

    # Collect calls needed: {(d, sp): {'bid','offer'}}
    calls_needed = _collect_needed_calls(df, start_date, end_date)
    print(f"  Unique (date, SP) pairs in range: {len(calls_needed)}")

    # Fetch payloads
    all_payloads = []
    for (d, sp), sides in tqdm(sorted(calls_needed.items()), desc="Fetching ISPSTACK", unit="pair"):
        for side in sorted(sides):
            payload = _get_ispstack(d, sp, side)
            if payload:
                all_payloads.append(payload)

    # Build price map
    price_map = _build_price_map_from_payloads(all_payloads, price_field=price_field, weight_field=weight_field)
    print(f"  Built price map entries: {len(price_map)}")

    # Apply to df (only within date range unless overwrite flag)
    df["__d"] = dates_norm
    if not overwrite_accepts_outside_range:
        mask_target = (df["__d"] >= start_date) & (df["__d"] <= end_date)
    else:
        mask_target = pd.Series(True, index=df.index)

    # Ensure accepted_price/balancing_cost exist
    if "accepted_price" not in df.columns:
        df["accepted_price"] = np.nan
    if "balancing_cost" not in df.columns:
        df["balancing_cost"] = np.nan

    # Map prices for target rows only
    df_target = df.loc[mask_target].copy()
    before_mapped = df_target["accepted_price"].notna().sum()
    df_target = _map_prices_onto_csv(df_target, price_map)
    after_mapped = df_target["accepted_price"].notna().sum()
    newly_mapped = after_mapped - before_mapped
    print(f"  Rows newly mapped with accepted_price: {newly_mapped}")

    # Compute balancing_cost for target rows where price & volume are present
    # cost = total_volume_accepted * accepted_price  (sign carried by volume)
    can_cost = df_target["accepted_price"].notna() & df_target["total_volume_accepted"].notna()
    df_target.loc[can_cost, "balancing_cost"] = df_target.loc[can_cost, "total_volume_accepted"] * df_target.loc[can_cost, "accepted_price"]

    # Write back
    df.update(df_target[["accepted_price", "balancing_cost"]])
    df.drop(columns=["__d"], inplace=True, errors="ignore")

    # Save in-place
    df.to_csv(csv_path, index=False)
    mapped_cnt = df["accepted_price"].notna().sum()
    cost_cnt   = df["balancing_cost"].notna().sum()
    print(f"  Saved {csv_path} | accepted_price set: {mapped_cnt:,} | balancing_cost set: {cost_cnt:,}")

# ---------------------------------------------------------------------
# Pull the price data and process it into balancing_costs
# ---------------------------------------------------------------------
# Systems with 32GB+ of RAM can uncomment the code below to pull a large range of data in one go
# START_DATE   = "2021-01-01"
# END_DATE     = "2025-08-31"
# boa_df = pd.read_csv("boadf_raw.csv")
# wipe_columns_with_nan("boadf_raw.csv", "accepted_price", "balancing_cost")
# augment_csv_with_ispstack_prices("boadf_raw.csv", start_date=START_DATE, end_date=END_DATE)

# However, we break the data down by year and pull one at a time to avoid memory issues
# 2021-2024
for year in range(2021, 2024):
    start_date = f"{year}-01-01"
    end_date = f"{year}-12-31"
    boa_df = pd.read_csv(f"{year}boadf_processed.csv")
    wipe_columns_with_nan(f"{year}boadf_processed.csv", "accepted_price", "balancing_cost")
    augment_csv_with_ispstack_prices(f"{year}boadf_processed.csv", start_date=start_date, end_date=end_date)

# 2025
boa_df = pd.read_csv("2025boadf_processed.csv")
wipe_columns_with_nan("2025boadf_processed.csv", "accepted_price", "balancing_cost")
augment_csv_with_ispstack_prices("2025boadf_processed.csv", start_date="2025-01-01", end_date="2025-08-31")
