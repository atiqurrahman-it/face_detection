import React, { useState } from "react";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";
import EmotionBreakdown from "../../common/EmotionBreakdown";

const WS_URL = "ws://localhost:8000";
const VALID_TYPES = ["image/png", "image/jpeg", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const ImageInput = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [finalEmotion, setFinalEmotion] = useState("None");
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const sendImageToServer = (imageSrc) => {
    const socket = new WebSocket(WS_URL);
    const apiCall = {
      event: "localhost:subscribe",
      data: { image: imageSrc },
    };

    socket.onopen = () => socket.send(JSON.stringify(apiCall));

    socket.onmessage = (event) => {
      const pred_log = JSON.parse(event.data);
      if (pred_log.error) {
        setError(pred_log.error);
        setPredictions(null);
        return;
      }

      const predictionMap = pred_log["predictions"];
      const emotions = Object.keys(predictionMap);
      const values = emotions.map((emotion) => predictionMap[emotion] * 100);
      const maxIndex = values.indexOf(Math.max(...values));

      setFinalEmotion(emotions[maxIndex]);
      setFinalPercentage(Math.round(values[maxIndex]));
      setPredictions(predictionMap);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);
  };

  const handleFileUpload = (file) => {
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      setError("File type must be PNG, JPG, or GIF.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("File size must be less than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result;
      setSelectedImage(base64Image);
      setError("");
      sendImageToServer(base64Image);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileUpload(event.dataTransfer.files[0]);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-16 pt-10 lg:flex-row lg:items-start lg:justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 font-semibold text-slate-800 dark:text-white">
              Upload a Photo
            </h2>

            <label
              htmlFor="file-upload"
              onDrop={handleDrop}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                isDragging
                  ? "border-emerald-500 bg-emerald-500/5"
                  : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
              }`}
            >
              <svg
                className="mb-3 h-10 w-10 text-slate-400"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="text-emerald-500">Click to upload</span> or
                drag and drop
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PNG, JPG or GIF (max 10MB)
              </p>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                className="sr-only"
                onChange={(event) => handleFileUpload(event.target.files[0])}
              />
            </label>

            {error && (
              <p className="mt-3 text-sm text-rose-500">{error}</p>
            )}

            {selectedImage && (
              <img
                src={selectedImage}
                alt="Uploaded preview"
                className="mt-5 w-full rounded-xl object-cover"
                style={{ maxHeight: 320 }}
              />
            )}
          </div>

          <EmotionBreakdown
            emotion={finalEmotion}
            percentage={finalPercentage}
            predictions={predictions}
            hint="Upload a photo to see the emotion breakdown."
          />
        </main>
      </div>
    </div>
  );
};

export default ImageInput;
