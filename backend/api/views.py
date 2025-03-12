from rest_framework.views import APIView
from rest_framework.response import Response
from .services.data_fetcher import NESODataFetcher, BMUDataFetcher
from .services.data_processor import ImbalanceProcessor
from datetime import datetime

class ImbalanceDataView(APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        # Convert string dates to datetime
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Fetch and process data
        fetcher = NESODataFetcher()
        processor = ImbalanceProcessor()
        
        raw_data = fetcher.fetch_boa_data(start_date, end_date)
        processed_data = processor.aggregate_imbalances_by_zone(raw_data)
        
        return Response(processed_data)

class BMUMetadataView(APIView):
    def get(self, request, bmu_id):
        fetcher = BMUDataFetcher()
        metadata = fetcher.fetch_bmu_metadata(bmu_id)
        return Response(metadata) 