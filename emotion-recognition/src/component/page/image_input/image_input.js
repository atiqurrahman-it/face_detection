import React, { useState } from "react";
import EmotionBreakdown from "../../common/EmotionBreakdown";
import FaceOverlay from "../../common/FaceOverlay";

const WS_URL = "ws://localhost:8000";
const VALID_TYPES = ["image/png", "image/jpeg", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const ImageInput = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [faces, setFaces] = useState([]);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
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
      setFrameSize({ width: pred_log.imageWidth, height: pred_log.imageHeight });
      setFaces(pred_log.faces || []);
      setError(pred_log.error || "");
      socket.close();
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      socket.close();
    };
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
      setFaces([]);
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 xl:flex-row xl:items-start">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 xl:max-w-xl xl:shrink-0">
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

            {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

            {faces.length > 1 && (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                {faces.length} faces detected
              </p>
            )}

            {selectedImage && (
              <div className="relative mt-5 overflow-hidden rounded-xl">
                <img src={selectedImage} alt="Uploaded preview" className="w-full" />
                <FaceOverlay
                  faces={faces}
                  sourceWidth={frameSize.width}
                  sourceHeight={frameSize.height}
                />
              </div>
            )}
          </div>

          <div className="w-full xl:flex-1">
            {faces.length === 0 ? (
              <div className="w-full max-w-sm">
                <EmotionBreakdown
                  emotion="None"
                  percentage={0}
                  predictions={null}
                  hint="Upload a photo to see the emotion breakdown."
                />
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
                {faces.map((face, index) => {
                  const percentage = Math.round(
                    Math.max(...Object.values(face.predictions)) * 100
                  );
                  return (
                    <div key={index}>
                      {faces.length > 1 && (
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Face {index + 1}
                        </p>
                      )}
                      <EmotionBreakdown
                        emotion={face.emotion}
                        percentage={percentage}
                        predictions={face.predictions}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
    </main>
  );
};

export default ImageInput;
