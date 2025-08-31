import os, sys, time, base64, re, glob
from pathlib import Path
from contextlib import contextmanager
import gdown

# Ensure 'backend' is on path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from api.services.data_processor import DataProcessor

@contextmanager
def gdown_cookies_from_env():
    """
    Write cookies from env to ~/.cache/gdown/cookies.txt, yield, then delete.
    Env order: GDOWN_COOKIES_B64 (base64) -> GDOWN_COOKIES (plain) -> cookies.txt (plain).
    """
    home = Path.home()
    cache_dir = home / ".cache" / "gdown"
    cookie_path = cache_dir / "cookies.txt"

    raw_b64 = os.getenv("GDOWN_COOKIES_B64")
    raw_txt = os.getenv("GDOWN_COOKIES")
    raw_odd = os.getenv("cookies.txt")  # only if you truly named it this

    cookie_bytes = None
    if raw_b64:
        try:
            cookie_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            print(f"[initial_setup] WARNING: invalid base64 in GDOWN_COOKIES_B64: {e}")
    elif raw_txt:
        cookie_bytes = raw_txt.encode("utf-8")
    elif raw_odd:
        cookie_bytes = raw_odd.encode("utf-8")

    created = False
    try:
        if cookie_bytes:
            cache_dir.mkdir(parents=True, exist_ok=True)
            cookie_path.write_bytes(cookie_bytes)
            try: os.chmod(cookie_path, 0o600)
            except Exception: pass
            created = True
            print(f"[initial_setup] gdown cookies written to {cookie_path}")
        else:
            print("[initial_setup] No cookies found in env; proceeding without cookies.")
        yield cookie_path if created else None
    finally:
        if created and cookie_path.exists():
            try:
                cookie_path.unlink()
                print(f"[initial_setup] deleted cookie file {cookie_path}")
            except Exception as e:
                print(f"[initial_setup] WARNING: failed to delete cookie file: {e}")

def _download_with_retries(file_id: str, out_path: str, max_tries: int = 4) -> bool:
    last_err = None
    for attempt in range(1, max_tries + 1):
        try:
            # Primary: by id (uses cookies if present in ~/.cache/gdown/cookies.txt)
            gdown.download(id=file_id, output=out_path, quiet=False, use_cookies=True)
            return True
        except Exception as e:
            last_err = e
            # Fallback: view URL + fuzzy (still with cookies)
            try:
                url = f"https://drive.google.com/file/d/{file_id}/view?usp=sharing"
                gdown.download(url=url, output=out_path, quiet=False, use_cookies=True, fuzzy=True)
                return True
            except Exception as e2:
                last_err = e2
                msg = str(e2).lower()
                if any(k in msg for k in ["many accesses", "quota", "cannot retrieve the public link"]):
                    backoff = 15 * attempt
                    print(f"[initial_setup] Drive quota/interstitial. Retrying in {backoff}s...")
                    time.sleep(backoff)
                    continue
                break
    print(f"[initial_setup] WARNING: failed to download {file_id}: {last_err}")
    return False

YEAR_TO_DRIVE = {
    2021: "https://drive.google.com/file/d/1hYsU8348FDtHsjb68nROXQgePlFXjZHA/view?usp=drive_link",
    2022: "https://drive.google.com/file/d/1jXuHCJDgwiRg0LsOE_LJcDWG-_ZfWC-S/view?usp=drive_link",
    2023: "https://drive.google.com/file/d/1gDfLv0QkHFj59LOMwN3Fhy_of77QqkNf/view?usp=drive_link",
    2024: "https://drive.google.com/file/d/1n6cOyOlOgC8B2ICJwkujIEw9pvKWm0Xx/view?usp=drive_link",
    2025: "https://drive.google.com/file/d/1OTPT4TUqiwupGfYzmIdlvjfW7ClFJHXB/view?usp=drive_link",
}

def _extract_file_id(drive_url: str) -> str:
    m = re.search(r"/file/d/([^/]+)/", drive_url)
    if not m:
        raise ValueError(f"Cannot parse Google Drive file id from: {drive_url}")
    return m.group(1)

def _data_dir() -> Path:
    # Use DATA_DIR if set; otherwise default to your mounted path beside this file
    return Path(os.getenv("DATA_DIR", str(Path(__file__).resolve().parent / "data")))



def _has_processed_files(data_dir: Path) -> bool:
    return any(Path(p).is_file() for p in glob.glob(str(data_dir / "*boadf_processed.csv")))

def _existing_processed_years(data_dir: Path) -> set:
    years = set()
    for p in data_dir.glob("*boadf_processed.csv"):
        m = re.search(r"(20\d{2})boadf_processed\\.csv$", p.name)
        if m:
            try:
                years.add(int(m.group(1)))
            except Exception:
                pass
    return years

def _download_if_needed():
    """
    Download and save missing yearly processed files only.
    - Determine which years are missing based on files named {year}boadf_processed.csv
    - For each missing year, download from the mapped Drive link and save
    """
    import pandas as pd

    data_dir = _data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)

    existing_years = _existing_processed_years(data_dir)
    desired_years = set(YEAR_TO_DRIVE.keys())
    missing_years = sorted(list(desired_years - existing_years))

    if not missing_years:
        print("[initial_setup] All processed files for configured years already present. Skipping downloads.")
        return

    print(f"[initial_setup] Missing processed years detected: {missing_years}. Downloading...")

    for year in missing_years:
        url = YEAR_TO_DRIVE[year]
        file_id = _extract_file_id(url)
        temp_path = data_dir / f"download_{year}_{file_id}.csv"

        if not _download_with_retries(file_id, str(temp_path)):
            (data_dir / f"FAILED_{year}_{file_id}.txt").write_text("Download failed during deploy\n")
            continue

        if not temp_path.exists() or temp_path.stat().st_size == 0:
            print(f"[initial_setup] WARNING: Empty file for year={year} id={file_id}")
            continue

        try:
            sample = pd.read_csv(temp_path, nrows=1000)
            inferred_year = None
            if "settlement_date" in sample.columns:
                sd = pd.to_datetime(sample["settlement_date"], errors="coerce").dropna()
                if not sd.empty:
                    inferred_year = int(sd.iloc[0].year)
            if inferred_year is None:
                m = re.search(r"(20\d{2})", temp_path.name)
                if m:
                    inferred_year = int(m.group(1))

            if inferred_year is not None and inferred_year != year:
                print(f"[initial_setup] WARNING: Inferred year {inferred_year} differs from expected {year} for id={file_id}")

            target = data_dir / f"{year}boadf_processed.csv"
            if target.exists() and target.stat().st_size > 0:
                print(f"[initial_setup] Target exists, keeping: {target}")
                temp_path.unlink(missing_ok=True)
            else:
                temp_path.rename(target)
                print(f"[initial_setup] Saved processed file: {target}")
        except Exception as e:
            print(f"[initial_setup] Error processing downloaded CSV for year {year}: {e}")
            continue

def log_dir(path: Path, indent: int = 0):
    prefix = " " * indent
    if not path.exists():
        print(f"{prefix}(missing) {path}")
        return
    for item in sorted(path.iterdir()):
        if item.is_dir():
            print(f"{prefix}[DIR] {item.name}/")
            log_dir(item, indent + 2)
        else:
            size_mb = item.stat().st_size / 1e6
            print(f"{prefix}{item.name} ({size_mb:.1f} MB)")

def main():
    print("Starting initial data processing...")
    with gdown_cookies_from_env():
        _download_if_needed()
        data_dir = _data_dir()
        # Only build core data if we actually have something
        if any(data_dir.glob("*boadf_processed.csv")):
            processor = DataProcessor()
            processor.create_all_core_data()
        else:
            print("[initial_setup] No processed files present; skipping DataProcessor.")
        print("Disk contents after setup:")
        log_dir(data_dir)
    print("Initial data processing finished.")

if __name__ == "__main__":
    main()
