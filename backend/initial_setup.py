import os
import sys
import time
from pathlib import Path
import glob
import re
import gdown

# Ensure 'backend' is on path (file is inside backend/)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.services.data_processor import DataProcessor

def _download_with_retries(file_id: str, out_path: str, max_tries: int = 4):
    last_err = None
    for attempt in range(1, max_tries + 1):
        try:
            # Try by id (most reliable)
            gdown.download(id=file_id, output=out_path, quiet=False, use_cookies=False)
            return
        except Exception as e:
            last_err = e
            # Fallback: let gdown parse a view URL
            try:
                url = f"https://drive.google.com/file/d/{file_id}/view?usp=sharing"
                gdown.download(url=url, output=out_path, quiet=False, use_cookies=False, fuzzy=True)
                return
            except Exception as e2:
                last_err = e2
                # If quota / many accesses, backoff and try again
                msg = str(e2).lower()
                if any(k in msg for k in ["many accesses", "quota", "cannot retrieve the public link"]):
                    time.sleep(15 * attempt)
                    continue
                # Otherwise, no point retrying
                break
    raise RuntimeError(f"Failed to download {file_id}: {last_err}")

DRIVE_LINKS = [
    "https://drive.google.com/file/d/1gDfLv0QkHFj59LOMwN3Fhy_of77QqkNf/view?usp=drive_link", #2023
    "https://drive.google.com/file/d/1n6cOyOlOgC8B2ICJwkujIEw9pvKWm0Xx/view?usp=drive_link", #2024
    "https://drive.google.com/file/d/1OTPT4TUqiwupGfYzmIdlvjfW7ClFJHXB/view?usp=drive_link"  #2025  
]

def _extract_file_id(drive_url: str) -> str:
    """
    Accepts a Google Drive 'file/d/<id>/view' URL and returns the <id>.
    """
    m = re.search(r"/file/d/([^/]+)/", drive_url)
    if not m:
        raise ValueError(f"Cannot parse Google Drive file id from: {drive_url}")
    return m.group(1)

def _data_dir() -> Path:
    # matches the Render disk mount path:
    # /opt/render/project/src/backend/data
    return Path(__file__).resolve().parent / "data"

def _has_processed_files(data_dir: Path) -> bool:
    return any(Path(p).is_file() for p in glob.glob(str(data_dir / "*boadf_processed.csv")))

def _download_if_needed():
    """
    Downloads all Drive files into data_dir if no processed files exist.
    Renames each to {year}boadf_processed.csv by inspecting the CSV content.
    """
    data_dir = _data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)

    if _has_processed_files(data_dir):
        print("[initial_setup] Found processed files already. Skipping downloads.")
        return

    print("[initial_setup] No processed files found. Downloading from Google Drive...")
    import gdown
    import pandas as pd

    for url in DRIVE_LINKS:
        file_id = _extract_file_id(url)
        temp_path = data_dir / f"download_{file_id}.csv"
        _download_with_retries(file_id, str(temp_path))

        if not temp_path.exists() or temp_path.stat().st_size == 0:
            raise RuntimeError(f"Download failed or produced empty file for id={file_id}")

        # Infer year from settlement_date
        try:
            # Read a small chunk to find a valid settlement_date
            sample = pd.read_csv(temp_path, nrows=1000)
            year = None
            if "settlement_date" in sample.columns:
                # Coerce to datetime; take the first non-null year
                sd = pd.to_datetime(sample["settlement_date"], errors="coerce")
                sd = sd.dropna()
                if not sd.empty:
                    year = int(sd.iloc[0].year)

            if year is None:
                # Fallback: look for a 4-digit year in the filename as last resort
                m = re.search(r"(20\d{2})", temp_path.name)
                if m:
                    year = int(m.group(1))

            if year is None:
                raise ValueError("Could not infer year from CSV; ensure 'settlement_date' exists.")

            target = data_dir / f"{year}boadf_processed.csv"
            if target.exists() and target.stat().st_size > 0:
                print(f"[initial_setup] Target already exists, keeping existing: {target}")
                temp_path.unlink(missing_ok=True)
            else:
                temp_path.rename(target)
                print(f"[initial_setup] Saved processed file: {target}")

        except Exception as e:
            print(f"[initial_setup] Error inferring year for {temp_path.name}: {e}")
            # Keep the original download for debugging
            continue

def log_dir(path: Path, indent: int = 0):
    prefix = " " * indent
    for item in sorted(path.iterdir()):
        if item.is_dir():
            print(f"{prefix}[DIR] {item.name}/")
            log_dir(item, indent + 2)
        else:
            size_mb = item.stat().st_size / 1e6
            print(f"{prefix}{item.name} ({size_mb:.1f} MB)")

def main():
    print("Starting initial data processing...")
    # Ensure data exists
    _download_if_needed()

    # Build core data
    processor = DataProcessor()
    processor.create_all_core_data()
    print("Initial data processing finished.")
    print("Disk contents after setup:")
    data_dir = Path(__file__).resolve().parent / "data"
    log_dir(data_dir)

if __name__ == "__main__":
    main()
