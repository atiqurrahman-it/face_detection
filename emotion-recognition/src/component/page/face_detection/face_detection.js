import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";

import "../../../App.css";
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

  const backgroundStyle = {
    backgroundImage: "url(/background1.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    width: "100%", // Full width
    height: "100vh", // Full height
  };

  const emotion_emoji = [
    { Angry: "😠" },
    { Disgust: "🤢" },
    { Fear: "😨" },
    { Happy: "😄" },
    { Neutral: "😐" },
    { Sad: "😢" },
    { Surprise: "😲" },
  ];

 const getEmotionEmoji = (emotion) => {
   const found = emotion_emoji.find((item) => Object.keys(item)[0] === emotion);
   return found ? found[emotion] : ""; // Return emoji or empty string if not found
 };


  return (
    <div style={backgroundStyle}>
      <Nav />

      <Webcam
        className="rounded-md	"
        ref={webcamRef}
        rounded-md
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 0,
          right: 600,
          top: 150,
          width: 640,
          height: 480,
        }}
      />

      <div
        className="Prediction"
        style={{ position: "absolute", right: 100, width: 500, top: 150 }}
      >
        <label
          htmlFor="finalEmotionProgress"
          style={{ color: "white", marginBottom: "3px" }}
        >
          Emotion : {finalEmotion} ({finalPercentage}%)
        </label>{" "}
        <br></br>
        <progress
          className="rounded-md"
          id="finalEmotionProgress"
          value={finalPercentage}
          max="100"
        >
          {finalPercentage}%
        </progress>
        <br />
        <br />
        <input
          className="rounded-md	"
          id="emotion_text"
          name="emotion_text"
          value={finalEmotion}
          style={{
            width: 200,
            height: 50,
            fontSize: "30px",
            textAlign: "center",
            borderRadius: "10px",
          }}
          readOnly
        />
        {getEmotionEmoji(finalEmotion)}
      </div>
    </div>
  );
};

export default RealFaceDetection;


// way two

// import React, { useEffect, useRef, useState } from "react";
// import Webcam from "react-webcam";
// import "../../../index.css";
// import Nav from "../../navbar/navbar";

// const RealFaceDetection = () => {
//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null); // Canvas for face frame
//   const [finalEmotion, setFinalEmotion] = useState("Neutral");
//   const [finalPercentage, setFinalPercentage] = useState(0);
//   const [faceCoords, setFaceCoords] = useState([]); // Store face coordinates

//   const detect = async () => {
//     if (webcamRef.current && webcamRef.current.video.readyState === 4) {
//       const imageSrc = webcamRef.current.getScreenshot();
//       sendImageToServer(imageSrc);
//     }
//   };

//   const sendImageToServer = (imageSrc) => {
//     const socket = new WebSocket("ws://localhost:8000");
//     const apiCall = {
//       event: "localhost:subscribe",
//       data: { image: imageSrc },
//     };

//     socket.onopen = () => {
//       console.log("WebSocket connection opened. Sending image data...");
//       socket.send(JSON.stringify(apiCall));
//     };

//     socket.onmessage = (event) => {
//       const pred_log = JSON.parse(event.data);
//       if (!pred_log.error) {
//         const predictions = pred_log["predictions"];
//         const emotions = Object.keys(predictions);
//         const values = emotions.map((emotion) => predictions[emotion] * 100);

//         const maxIndex = values.indexOf(Math.max(...values));
//         const emotion = emotions[maxIndex];
//         const percentage = Math.round(values[maxIndex]);

//         setFinalEmotion(emotion);
//         setFinalPercentage(percentage);

//         // Set the face coordinates from the response
//         setFaceCoords(pred_log["face_coords"]);
//       }
//     };

//     socket.onerror = (error) => {
//       console.error("WebSocket error:", error);
//     };

//     socket.onclose = () => {
//       console.log("WebSocket connection closed.");
//     };
//   };

//   // Function to draw face frames on the canvas
//   const drawFaceFrame = () => {
//     const canvas = canvasRef.current;
//     const video = webcamRef.current.video;
//     const ctx = canvas.getContext("2d");

//     // Make sure canvas size matches the webcam video size
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     // Clear the previous canvas drawing
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     if (faceCoords.length > 0) {
//       faceCoords.forEach((face) => {
//         const { x, y, w, h } = face;
//         ctx.strokeStyle = "yellow";
//         ctx.lineWidth = 2;
//         ctx.strokeRect(x, y, w, h); // Draw face frame
//       });
//     }
//   };

//   // Update face frame when faceCoords are updated
//   useEffect(() => {
//     drawFaceFrame();
//   }, [faceCoords]);

//   // Start the face detection process every second
//   useEffect(() => {
//     const interval = setInterval(detect, 1000); // Detect emotions every second
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div>
//       <Nav />

//       <div style={{ position: "relative", width: "640px", height: "480px" }}>
//         <Webcam
//           ref={webcamRef}
//           screenshotFormat="image/jpeg"
//           style={{
//             position: "absolute",
//             marginTop:"60px",
//             width: "90%",
//             height: "100%",
//             right: 10,
//           }}
//         />
//         {/* Canvas for face frames */}
//         <canvas
//           ref={canvasRef}
//           style={{
//             position: "absolute",
//             left: 0,
//             top: 0,
//             width: "100%",
//             height: "100%",
//           }}
//         />
//       </div>

//       <div
//         className="Prediction"
//         style={{ position: "absolute", right: 100, width: 500, top: 150 }}
//       >
//         <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
//           Emotion : {finalEmotion} ({finalPercentage}%)
//         </label>
//         <br />
//         <progress id="finalEmotionProgress" value={finalPercentage} max="100">
//           {finalPercentage}%
//         </progress>
//         <br />
//         <br />
//         <input
//           id="emotion_text"
//           name="emotion_text"
//           value={finalEmotion}
//           style={{
//             width: 200,
//             height: 50,
//             fontSize: "30px",
//             textAlign: "center",
//           }}
//           readOnly
//         />
//       </div>
//     </div>
//   );
// };

// export default RealFaceDetection;
