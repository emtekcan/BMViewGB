import pandas as pd
import os
from __future__ import annotations
from pathlib import Path
from typing import Iterable, Sequence
import logging
import pandas as pd

"""
This script is used to drop redundant columns.
'col_bmu' is a duplicate of bm_unit with less data, 'pair_volumes_positive6' and 'pair_volumes_negative6' have all null values for every row in every file
This script should be run at some point after create_boa_datasets.py has created the processed CSV files in the same directory.
"""

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Update this list if the year set changes.
CSV_FILES: list[Path] = [
    Path("2021boadf_processed.csv"),
    Path("2022boadf_processed.csv"),
    Path("2023boadf_processed.csv"),
    Path("2024boadf_processed.csv"),
    Path("2025boadf_processed.csv"),
]

# Columns we consider redundant and intend to drop.
REDUNDANT_COLUMNS_COL_BMU: tuple[str, ...] = ("col_bmu",)
REDUNDANT_COLUMNS_PAIR_VOLUMES: tuple[str, ...] = (
    "pair_volumes_negative6",
    "pair_volumes_positive6",
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
)

# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

def _drop_columns_from_csv(csv_path: Path, columns: Sequence[str]) -> bool:
    """
    Drop provided columns from a single CSV file (if they exist) and overwrite in place.

    Returns True on successful processing (including the case where none of the
    columns existed); False if the file was missing or an error occurred.
    """
    if not csv_path.exists():
        logging.warning("File not found: %s", csv_path)
        return False

    try:
        df = pd.read_csv(csv_path)
    except Exception as exc:
        logging.error("Failed to read %s: %s", csv_path, exc)
        return False

    present = [c for c in columns if c in df.columns]
    if not present:
        logging.info("%s: no target columns present", csv_path.name)
        return True

    before_shape = df.shape
    df = df.drop(columns=present, errors="ignore")
    try:
        df.to_csv(csv_path, index=False)
    except Exception as exc:
        logging.error("Failed to write %s: %s", csv_path, exc)
        return False

    logging.info(
        "%s: dropped %s | shape %s -> %s",
        csv_path.name,
        ", ".join(present),
        before_shape,
        df.shape,
    )
    return True


def drop_columns_from_all(csv_files: Iterable[Path], columns: Sequence[str]) -> None:
    """
    Apply _drop_columns_from_csv to each file and print a short summary.
    """
    total = 0
    ok = 0
    for p in csv_files:
        total += 1
        if _drop_columns_from_csv(p, columns):
            ok += 1
    logging.info("Processed %d/%d files", ok, total)


def check_columns(csv_files: Iterable[Path], targets: Sequence[str] | None = None) -> None:
    """
    Print shapes and (optionally) whether target columns exist in each file.
    """
    for p in csv_files:
        if not p.exists():
            logging.warning("File not found: %s", p)
            continue
        try:
            df = pd.read_csv(p)
        except Exception as exc:
            logging.error("Failed to read %s: %s", p, exc)
            continue

        logging.info("%s: shape=%s", p.name, df.shape)
        if targets:
            for col in targets:
                status = "present" if col in df.columns else "absent"
                logging.info("  - %s: %s", col, status)

# Drop 'col_bmu'
drop_columns_from_all(CSV_FILES, REDUNDANT_COLUMNS_COL_BMU)

# Drop pair volumes6 columns
drop_columns_from_all(CSV_FILES, REDUNDANT_COLUMNS_PAIR_VOLUMES)