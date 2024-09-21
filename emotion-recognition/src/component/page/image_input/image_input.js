import React, { useState } from "react";
import Nav from "../../navbar/navbar";

const ImageInput = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [finalEmotion, setFinalEmotion] = useState("None");
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [error, setError] = useState("");

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    handleFileUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    handleFileUpload(file);
  };

  const handleFileUpload = (file) => {
    if (file) {
      const validTypes = ["image/png", "image/jpeg", "image/gif"];
      const maxSize = 10 * 1024 * 1024; // 100MB

      if (!validTypes.includes(file.type)) {
        setError("File type must be PNG, JPG, or GIF.");
        return;
      }
      if (file.size > maxSize) {
        setError("File size must be less than 100MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Image = reader.result;
        sendImageToServer(base64Image);
        setSelectedImage(base64Image);
        setError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const sendImageToServer = (imageSrc) => {
    const socket = new WebSocket("ws://localhost:8000");
    const apiCall = {
      event: "localhost:subscribe",
      data: { image: imageSrc },
    };

    socket.onopen = () => {
      socket.send(JSON.stringify(apiCall));
    };

    socket.onmessage = (event) => {
      const pred_log = JSON.parse(event.data);
      if (!pred_log.error) {
        const predictions = pred_log["predictions"];
        const emotions = Object.keys(predictions);
        const values = emotions.map((emotion) => predictions[emotion] * 100);

        const maxIndex = values.indexOf(Math.max(...values));
        const emotion = emotions[maxIndex];
        const percentage = Math.round(values[maxIndex]);

        setFinalEmotion(emotion);
        setFinalPercentage(percentage);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
    };
  };

  return (
    <div>
      <Nav />
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            padding: 20,
          }}
        >
          <div>
            <div className="col-span-full">
              <label
                htmlFor="cover-photo"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                {/* Cover photo */}
              </label>
              <div
                className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="mt-4 flex text-sm leading-6 text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md bg-white font-semibold text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 hover:text-indigo-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-600">
                    PNG, JPG, GIF up to 100MB
                  </p>
                  {error && <p className="text-red-500">{error}</p>}
                </div>
              </div>
            </div>
            {selectedImage && (
              <img
                src={selectedImage}
                alt="Uploaded"
                className="h-40 w-70"
                style={{ marginTop: 20 }}
              />
            )}
          </div>

          <div className="Prediction" style={{ marginTop: 20 }}>
            <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
              Emotion: {finalEmotion} ({finalPercentage}%)
            </label>
            <br />
            <progress
              id="finalEmotionProgress"
              value={finalPercentage}
              max="100"
            >
              {finalPercentage}%
            </progress>
            <br />
            <br />

            <input
              id="emotion_text"
              name="emotion_text"
              value={finalEmotion}
              style={{
                width: 200,
                height: 50,
                fontSize: "30px",
                textAlign: "center",
              }}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageInput;
