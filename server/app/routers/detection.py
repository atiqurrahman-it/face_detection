import json
import base64
import os

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
from keras.models import load_model
from keras.preprocessing.image import img_to_array

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

face_classifier = cv2.CascadeClassifier(os.path.join(BASE_DIR, 'haarcascade_frontalface_default.xml'))
classifier = load_model(os.path.join(BASE_DIR, 'model.h5'))

emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']


@router.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_text()
            payload = json.loads(payload)
            imageByt64 = payload['data']['image'].split(',')[1]

            image = np.frombuffer(base64.b64decode(imageByt64), np.uint8)
            image = cv2.imdecode(image, cv2.IMREAD_COLOR)

            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_classifier.detectMultiScale(gray, 1.3, 5)

            results = []
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y + h, x:x + w]
                roi_gray = cv2.resize(roi_gray, (48, 48), interpolation=cv2.INTER_AREA)

                roi = roi_gray.astype('float') / 255.0
                roi = img_to_array(roi)
                roi = np.expand_dims(roi, axis=0)

                prediction = classifier.predict(roi, verbose=0)[0]
                emotion = emotion_labels[prediction.argmax()]

                results.append({
                    "box": {"x": int(x), "y": int(y), "w": int(w), "h": int(h)},
                    "emotion": emotion,
                    "predictions": dict(zip(emotion_labels, map(float, prediction))),
                })

            response = {
                "faces": results,
                "imageWidth": image.shape[1],
                "imageHeight": image.shape[0],
            }
            if not results:
                response["error"] = "No face detected"

            await websocket.send_json(response)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()
