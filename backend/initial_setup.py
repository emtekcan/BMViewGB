import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.services.data_processor import DataProcessor

def main():
    print("Starting initial data processing...")
    processor = DataProcessor()
    processor.create_all_core_data()
    print("Initial data processing finished.")

if __name__ == "__main__":
    main() 