function confirmDelete(fileId, filename) {
    if (confirm(`Are you sure you want to delete "${filename}"?\n\nThis action cannot be undone.`)) {
        // Redirect to delete URL
        window.location.href = `/files/delete/${fileId}/`;
    }
}


document.addEventListener('DOMContentLoaded', function() {
    // Handle delete button clicks
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            e.preventDefault();
            const fileId = e.target.getAttribute('data-file-id');
            const filename = e.target.getAttribute('data-filename');
            confirmDelete(fileId, filename);
        }
    });

    // Handle alert messages auto-hide
    const messages = document.querySelectorAll('.alert');
    
    // Check if messages exist before trying to iterate
    if (messages && messages.length > 0) {
        messages.forEach(function(message) {
            setTimeout(function() {
                message.style.opacity = '0';
                setTimeout(function() {
                    message.remove();
                }, 500);
            }, 3000);
        });
    }

    // Basic file upload validation
    const uploadForm = document.getElementById('uploadForm');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            const fileInput = this.querySelector('.file-input');
            if (!fileInput.files || fileInput.files.length === 0) {
                e.preventDefault();
                alert('Please select a file to upload.');
                return false;
            }
        });
    }
});