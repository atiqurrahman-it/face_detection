import io
import os

from app.storage import UPLOAD_ROOT, save_criminal_photo


class _FakeUpload:
    def __init__(self, filename: str, content: bytes):
        self.filename = filename
        self.file = io.BytesIO(content)


def test_save_criminal_photo_writes_file_and_returns_relative_path():
    upload = _FakeUpload("selfie.jpg", b"fake-image-bytes")

    relative_path = save_criminal_photo("CR-TEST-001", "front", upload)

    assert relative_path == "criminals/CR-TEST-001/front.jpg"
    written_path = os.path.join(UPLOAD_ROOT, relative_path)
    assert os.path.isfile(written_path)
    with open(written_path, "rb") as f:
        assert f.read() == b"fake-image-bytes"

    os.remove(written_path)
    os.rmdir(os.path.dirname(written_path))
