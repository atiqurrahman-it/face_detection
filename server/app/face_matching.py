import io
import json
from typing import List, Optional

import face_recognition
import numpy as np


def compute_face_embedding(image_bytes: bytes) -> Optional[List[float]]:
    try:
        image = face_recognition.load_image_file(io.BytesIO(image_bytes))
    except Exception:
        return None
    encodings = face_recognition.face_encodings(image)
    if not encodings:
        return None
    return encodings[0].tolist()


def encode_embedding(embedding: List[float]) -> str:
    return json.dumps(embedding)


def decode_embedding(raw: str) -> np.ndarray:
    return np.array(json.loads(raw))


def face_distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))
