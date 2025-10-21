from django.shortcuts import render

# Create your views here.
def index(request):
    return render(request, 'index.html')

def host(request):
    return render(request, 'host.html')

def view(request):
    return render(request, 'view.html')