import os
import sys
from pathlib import Path
import glob
import re

# Ensure 'backend' is on path (file is inside backend/)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.services.data_processor import DataProcessor

DRIVE_LINKS = [
    "https://drive.google.com/file/d/1yxwAweOpvetnbb7dc_9bvyC71puJYcy8/view?usp=drive_link",
    "https://drive.google.com/file/d/1gty0Ic-RepFkstl45A_3wdBAYw5aXzfA/view?usp=drive_link",
    "https://drive.google.com/file/d/1vD8XHFF74fgPoRAfOJtWom6vQIrXNJoM/view?usp=drive_link",
    "https://drive.google.com/file/d/1kzi2nbdC_AGKrjOod39jU4ZUbe7ID1uB/view?usp=drive_link",
    "https://drive.google.com/file/d/1CJxjCUgkfu2aQoWnfSlZsJlPdW1z4h2z/view?usp=drive_link",
    
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
        gdown.download(f"https://drive.google.com/uc?id={file_id}", str(temp_path), quiet=False)

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
