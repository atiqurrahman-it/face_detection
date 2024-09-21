import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

import "../../../index.css";
import Nav from "../../navbar/navbar";
const RealFaceDetection = () => {
  const webcamRef = useRef(null);
  const [finalEmotion, setFinalEmotion] = useState("Neutral");
  const [finalPercentage, setFinalPercentage] = useState(0);

  const detect = async () => {
    if (
      webcamRef.current &&
      webcamRef.current.video.readyState === 4
    ) {
      const imageSrc = webcamRef.current.getScreenshot();
      sendImageToServer(imageSrc);
    }
  };

  const sendImageToServer = (imageSrc) => {
    const socket = new WebSocket("ws://localhost:8000");
    const apiCall = {
      event: "localhost:subscribe",
      data: { image: imageSrc },
    };

    socket.onopen = () => {
      console.log("WebSocket connection opened. Sending image data...");
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

  useEffect(() => {
    const interval = setInterval(detect, 1000); // Detect emotions every second
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Nav />
      
      <Webcam
        ref={webcamRef}
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 600,
          top: 80,
          width: 640,
          height: 480,
        }}
      />

      <div
        className="Prediction"
        style={{ position: "absolute", right: 100, width: 500, top: 150 }}
      >
        <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
          Emotion : {finalEmotion} ({finalPercentage}%)
        </label> <br></br>
        <progress id="finalEmotionProgress" value={finalPercentage} max="100">
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
  );
};

export default RealFaceDetection;
