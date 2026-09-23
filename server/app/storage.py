import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
CRIMINAL_PHOTOS_ROOT = os.path.join(UPLOAD_ROOT, "criminals")


def save_criminal_photo(criminal_code: str, angle: str, upload) -> str:
    ext = os.path.splitext(upload.filename or "")[1] or ".jpg"
    directory = os.path.join(CRIMINAL_PHOTOS_ROOT, criminal_code)
    os.makedirs(directory, exist_ok=True)
    filename = f"{angle}{ext}"
    dest_path = os.path.join(directory, filename)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return os.path.relpath(dest_path, UPLOAD_ROOT).replace(os.sep, "/")
