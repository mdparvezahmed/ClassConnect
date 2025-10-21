from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('host/', views.host, name='host'),
    path('view/', views.view, name='view'),
]