from django.urls import path
from . import views


urlpatterns = [
    path('share/', views.share, name='file'),
    path('delete/<int:file_id>/', views.delete_file, name='delete_file'),
]