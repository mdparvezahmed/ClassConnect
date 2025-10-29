from django.urls import re_path
from . import consumers


websocket_urlpatterns = [
    re_path(r'ws/host/$', consumers.ScreenShareConsumer.as_asgi()),
    re_path(r'ws/viewer/$', consumers.ScreenShareConsumer.as_asgi()),
]