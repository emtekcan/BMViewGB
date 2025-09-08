# BMViewGB Data Collection Scripts

## Overview

Welcome to the data collection scripts for the **BMViewGB** project. This directory contains the Python scripts necessary to download, process, and assemble the datasets used by the application.

The primary data source is the **Elexon Insights Solution API**. This is supplemented with data from the **Elexon Portal** and the **National Grid ESO Data Portal** to provide a comprehensive view of the Balancing Mechanism.

These scripts were originally part of a single, large Jupyter Notebook. To make the process more manageable and version-controllable, the notebook's functionality was split into the individual scripts found here.

---

##  Prerequisites: External Data Files

Before running any scripts, you must manually download a few essential data files. These files provide critical information not available directly through the main Elexon API endpoints used in these scripts. Place all downloaded files in this same directory (`data_collection_scripts/`).

### 1. Transmission Loss Factor (TLF) Network Mapping Statement

This file is used by `create_boa_datasets.py` to map Balancing Mechanism Units (BMUs) connected to the Transmission Network to their correct Grid Supply Point (GSP) group, which is essential for geospatial visualization.

* **File to Download**: `TLFA-I001_NMS_2023-2024.csv`
* **Source**: [Elexon Portal - Operational Data (ID: NMS)](https://www.elexonportal.co.uk/category/view/179)
* **notes**: Provides GSP region IDs for units connected directly to the transmission network, which is data not available from the Elexon API bmunits endpoint. This file cannot be redistributed in this repository due to Elexon's terms of use however the data is publicly available for free directly from Elexon themselves

### 2. NESO Skip Rate Datasets

These files are used by `add_fuel_types.py` as a fallback source to add fuel type information for BMUs where this data is missing from the primary Elexon `bmunits` endpoint.

* **Files to Download**: Look for files named "Skip Rate - In Merit All Balancing Mechanism..." for recent months. The script is configured to look for the following filenames:
    * `bm_skips_12_2024.csv`
    * `bm_skips_01_2025.csv`
    * `bm_skips_02_2025.csv`
    * `bm_skips_03_2025.csv`
    * `bm_skips_04_2025.csv`
    * `bm_skips_05_2025.csv`
    * `bm_skips_06_2025.csv`
* **Source**: [NESO Data Portal - Skip Rates](https://www.neso.energy/data-portal/skip-rates)
* **Reason**: Provides additional fuel type classifications for BMUs, significantly improving data completeness.

---

## Execution Guide

To successfully recreate the BMViewGB dataset, you must run the scripts in a specific order. The first script creates the base CSV files, and the subsequent scripts enrich them with additional columns.

### ⚠️ **Critical First Step**

You **must run `create_boa_datasets.py` first**. This script fetches the core Bid Offer Acceptance data from Elexon and generates the yearly processed files (e.g., `2024boadf_processed.csv`) that all other scripts depend on.

### Recommended Execution Order

While the scripts after the first one are *theoretically* independent, they have been validated to produce the final dataset correctly when run in the following sequence.

1.  **`python create_boa_datasets.py`**
    * Fetches all Bid Offer Acceptance volumes from Elexon for the specified date range (Jan 2021 - August 2025 by default).
    * Performs initial processing and fills in GSP group information using the TLF file.
    * **Output**: Creates the `YYYYboadf_processed.csv` files.

2.  **`python add_system_flag.py`**
    * Adds the `system_operator_flag` column by fetching data from the BOALF endpoint. This flag distinguishes between "energy" actions (for balancing supply and demand) and "system" actions (for managing grid constraints).

3.  **`python add_fuel_types.py`**
    * Adds the `bmu_fuel_type` column. It first uses data from the Elexon `bmunits` endpoint and then fills in any missing values using the downloaded NESO Skip Rate datasets.

4.  **`python drop_redundant_cols.py`**
    * Performs a cleanup step by removing columns that are duplicated or contain no useful data (`col_bmu`, `pair_volumes_negative6`, `pair_volumes_positive6`).

5.  **`python add_balancing_costs.py`**
    * Fetches detailed pricing data from the ISPSTACK endpoint to calculate and add the `accepted_price` and `balancing_cost` for each action.

After running these five scripts in order, you will have a complete set of CSV files, identical to those used in the main application. You can then move these files to the `backend/data/` directory.

---

## Important Notes

* **API Caching in `add_balancing_costs.py`**: The final script, `add_balancing_costs.py`, is the most data-intensive. To avoid re-downloading gigabytes of data on subsequent runs, it automatically caches the API responses in a new directory named `cache_ispstack/`. If you need to force a complete re-fetch of the pricing data, simply **delete the `cache_ispstack/` directory** before running the script.
* **Execution Time**: Please be aware that these scripts, particularly the first and last ones, can take a significant amount of time to complete due to the large volume of data being requested from the Elexon APIs.
* **BMViewGB live and localhost data fetching**: These scripts build the large historical dataset and the BMViewGB website is designed to fetch data in real time on top of the data fetched by these scripts.
