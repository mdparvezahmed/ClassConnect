from django.urls import path
from . import views


urlpatterns = [
    path('share/', views.share_file, name='file'),
]