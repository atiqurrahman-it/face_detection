# Face & Emotion Detection

A real-time face and emotion detection app. A FastAPI backend receives webcam frames over a WebSocket, detects faces with OpenCV's Haar cascade classifier, and classifies the emotion (Angry, Disgust, Fear, Happy, Neutral, Sad, Surprise) with a Keras/TensorFlow model. A React frontend captures webcam/image input and displays the results.

## Project structure

```
face_detection/
├── server/                # FastAPI backend
│   ├── main.py            # WebSocket endpoint for face + emotion detection
│   ├── model.h5            # Trained emotion classification model
│   ├── haarcascade_frontalface_default.xml
│   └── requirements.txt
└── emotion-recognition/    # React frontend
    ├── src/
    │   ├── App.js           # Routes: "/", "/face-detection", "/input-image"
    │   └── component/
    └── package.json
```

## Prerequisites

- **Python 3.10** — the pinned dependencies (`tensorflow==2.8.0`, `keras==2.8.0`) do not have wheels for Python 3.11/3.12, so a newer system Python (e.g. Ubuntu 24.04's default 3.12) will fail to install them. On Ubuntu, install 3.10 via the deadsnakes PPA if you don't have it:
  ```bash
  sudo add-apt-repository ppa:deadsnakes/ppa
  sudo apt update
  sudo apt install python3.10 python3.10-venv
  ```
- Node.js 16+ and npm
- Git
- A webcam (for the live face-detection page)

## 0. Clone the repository

```bash
git clone git@github.com:atiqurrahman-it/face_detection.git
# or, over HTTPS:
# git clone https://github.com/atiqurrahman-it/face_detection.git

cd face_detection
```

## 1. Run the backend (server)

```bash
cd server

# create and activate a virtual environment (use the Python 3.10 interpreter)
python3.10 -m venv myenv
# Linux/macOS
source myenv/bin/activate
# Windows
myenv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# start the API
uvicorn main:app --reload
```

The WebSocket server starts on `ws://127.0.0.1:8000/` by default.

## 2. Run the frontend (client)

In a separate terminal:

```bash
cd emotion-recognition
npm install
npm start
```

This starts the React app on `http://localhost:3000`.

## Full process (clone → run, end to end)

Two terminals are needed, one for the backend and one for the frontend.

```bash
# 1. Clone
git clone git@github.com:atiqurrahman-it/face_detection.git
cd face_detection

# 2. Terminal 1 — backend
cd server
python3.10 -m venv myenv
source myenv/bin/activate      # Windows: myenv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload      # keep this running (ws://127.0.0.1:8000)

# 3. Terminal 2 — frontend
cd face_detection/emotion-recognition
npm install
npm start                       # keep this running (http://localhost:3000)
```

## Usage

1. Start the backend, then the frontend, as above.
2. Open `http://localhost:3000` in your browser.
3. Navigate to the face detection page (`/face-detection`) to run live webcam emotion detection, or `/input-image` to run detection on an uploaded image.
4. Allow camera access when prompted; detected faces and their predicted emotion will be shown on screen.
5. Stop either process with `Ctrl+C` in its terminal when done.

## Notes

- `server/main.py` loads `model.h5` and `haarcascade_frontalface_default.xml` using relative paths, so always run `uvicorn` from inside the `server/` directory.
- `optional_trail_emaition_data/` and `backgroundJson/` contain supplementary training/experiment data and UI background assets, and are not required to run the app.
- `server/myenv` is a leftover Windows virtual environment with no project packages installed. Do not reuse it — create a fresh virtual environment as shown in step 1 and install `requirements.txt` into it.
- If `python3 -m venv` fails with a missing `pip`/`ensurepip` module, install the venv/pip system packages first: `sudo apt install python3-venv python3-pip` (or `python3.10-venv` if using deadsnakes).
