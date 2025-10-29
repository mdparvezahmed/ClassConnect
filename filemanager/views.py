from django.shortcuts import redirect, render, get_object_or_404
from .forms import FileShareForm
from .models import FileShare
from django.contrib import messages
import os

# Create your views here.
def share(request):
    if request.method == 'POST':
        form = FileShareForm(request.POST, request.FILES)
        if form.is_valid():
            file_instance = form.save(commit=False)
            file_instance.filename = request.FILES['file'].name
            file_instance.save()
            messages.success(request, f'File "{file_instance.filename}" shared successfully!')
            return redirect('file')
        else:
            messages.error(request, 'Please select a valid file to upload.')
    else:
        form = FileShareForm()
    
    files = FileShare.objects.all()

    return render(request, 'file.html', {
        'form': form,
        'files': files
    })


def delete_file(request, file_id):
    file_instance = get_object_or_404(FileShare, id = file_id)
    filename = file_instance.filename

    try:
        if file_instance.file and os.path.isfile(file_instance.file.path):
            os.remove(file_instance.file.path)
        file_instance.delete()
        messages.success(request, f'File "{filename}" deleted successfully!')
    except Exception as e:
        messages.error(request, f'Error deleting file "{filename}": {str(e)}.')
        
    return redirect('file')