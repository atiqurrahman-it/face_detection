
# two option

import json
import base64
from typing import Optional
from fastapi import FastAPI, WebSocket
import cv2
import numpy as np
from keras.models import load_model
from keras.preprocessing.image import img_to_array

app = FastAPI()

# Load your local model and Haar cascade classifier
face_classifier = cv2.CascadeClassifier(r'.\haarcascade_frontalface_default.xml')
classifier = load_model(r'.\model.h5')

# Emotion labels corresponding to the classifier
emotion_labels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad', 'Surprise']

@app.websocket("/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        payload = await websocket.receive_text()
        payload = json.loads(payload)
        imageByt64 = payload['data']['image'].split(',')[1]

        # Decode and convert into image
        image = np.frombuffer(base64.b64decode(imageByt64), np.uint8)
        image = cv2.imdecode(image, cv2.IMREAD_COLOR)

        # Convert image to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_classifier.detectMultiScale(gray, 1.3, 5)

        response = {}
        if len(faces) > 0:
            for (x, y, w, h) in faces:
                roi_gray = gray[y:y + h, x:x + w]
                roi_gray = cv2.resize(roi_gray, (48, 48), interpolation=cv2.INTER_AREA)

                roi = roi_gray.astype('float') / 255.0
                roi = img_to_array(roi)
                roi = np.expand_dims(roi, axis=0)

                prediction = classifier.predict(roi)[0]
                emotion = emotion_labels[prediction.argmax()]
                response = {
                    "predictions": dict(zip(emotion_labels, map(float, prediction))),
                    "emotion": emotion
                }
        else:
            response = {"error": "No face detected"}

        await websocket.send_json(response)
    except Exception as e:
        print(f"Error: {e}")
        await websocket.close()




