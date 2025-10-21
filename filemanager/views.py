from django.shortcuts import render

# Create your views here.
def share_file(request):
    return render(request, 'file.html')