from django.urls import path
from .views import ImbalanceDataView, BMUMetadataView

urlpatterns = [
    path('imbalances/', ImbalanceDataView.as_view(), name='imbalances'),
    path('bmu/<str:bmu_id>/', BMUMetadataView.as_view(), name='bmu-metadata'),
] 