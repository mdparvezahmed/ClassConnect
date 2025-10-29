from django import forms
from .models import FileShare


class FileShareForm(forms.ModelForm):
    class Meta:
        model = FileShare
        fields = ['file']
        widgets = {
            'file': forms.FileInput(attrs={
                'class': 'file-input',
                'accept': '*/*',
            })
        }