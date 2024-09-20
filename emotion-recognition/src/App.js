import React, { useRef, useEffect, useState } from "react";
import "./App.css";
import Webcam from "react-webcam";

function App() {
  const webcamRef = useRef(null);
  const [finalEmotion, setFinalEmotion] = useState("Neutral");
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [currentPage, setCurrentPage] = useState("home"); // Manage the current section
  const [selectedImage, setSelectedImage] = useState(null);

  const detect = async () => {
    if (
      currentPage === "face-detection" &&
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      const imageSrc = webcamRef.current.getScreenshot();
      sendImageToServer(imageSrc);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64Image = reader.result;
      sendImageToServer(base64Image);
      setSelectedImage(base64Image); // Display the uploaded image
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  // const sendImageToServer = (imageSrc) => {
  //   const socket = new WebSocket("ws://localhost:8000");
  //   const apiCall = {
  //     event: "localhost:subscribe",
  //     data: { image: imageSrc },
  //   };

  //   socket.onopen = () => socket.send(JSON.stringify(apiCall));
  //   socket.onmessage = (event) => {
  //     const pred_log = JSON.parse(event.data);
  //     if (!pred_log.error) {
  //       const predictions = pred_log["predictions"];
  //       const emotions = Object.keys(predictions);
  //       const values = emotions.map((emotion) => predictions[emotion] * 100);

  //       const maxIndex = values.indexOf(Math.max(...values));
  //       const emotion = emotions[maxIndex];
  //       const percentage = Math.round(values[maxIndex]);

  //       setFinalEmotion(emotion);
  //       setFinalPercentage(percentage);
  //     }
  //   };
  // };
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
      console.log("Message received from server:", event.data);
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
  }, [currentPage]);

  // Reset emotion result when switching to "input-image"
  const handleNavClick = (page) => {
    setCurrentPage(page);
    if (page === "input-image") {
      setFinalEmotion("None");  // Reset emotion to "None"
      setFinalPercentage(0);    // Reset percentage to 0
      setSelectedImage(null);   // Clear previously selected image
    }
  };

  return (
    <div className="App">
      {/* Navbar */}
      <nav>
        <button onClick={() => handleNavClick("home")}>Home</button>
        <button onClick={() => handleNavClick("face-detection")}>Face Detection</button>
        <button onClick={() => handleNavClick("input-image")}>Input Image</button>
      </nav>

      {currentPage === "home" && <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "95vh",
    width: "100vw",
    fontSize: "30px", // Adjust the font size as needed
  }}>Welcome to the Emotion Detection App</div>}

      {/* Face Detection */}
      {currentPage === "face-detection" && (
        <>
          <Webcam
            ref={webcamRef}
            style={{
              position: "absolute",
              marginLeft: "auto",
              marginRight: "auto",
              left: 0,
              right: 600,
              top: 20,
              textAlign: "center",
              zIndex: 9,
              width: 640,
              height: 480,
            }}
          />

          <div className="Prediction" style={{ position: "absolute", right: 100, width: 500, top: 60 }}>
            <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
              Emotion : {finalEmotion} ({finalPercentage}%)
            </label>
            <progress id="finalEmotionProgress" value={finalPercentage} max="100">
              {finalPercentage}%
            </progress>
            <br /><br />

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
        </>
      )}

      {/* Input Image */}
      {currentPage === "input-image" && (
        <div style={{ textAlign: "center", marginTop: 50 }}>


          <div style={{ display: "flex", justifyContent: "space-around", alignItems:"center", padding: 20 }}>
            <div>
              <input type="file" onChange={handleImageUpload} /> <br/>
              {selectedImage && <img src={selectedImage} alt="Uploaded" style={{ width: 300, marginTop: 20 }} />}
            </div>
            
              <div className="Prediction" style={{ marginTop: 20 }}>
                <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
                  Emotion : {finalEmotion} ({finalPercentage}%)
                </label> <br></br>
                <progress id="finalEmotionProgress" value={finalPercentage} max="100">
                  {finalPercentage}%
                </progress>
                <br /><br />

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
      )}
    </div>
  );
}

export default App;

// option two 
// import React, { useRef, useEffect, useState } from "react";
// import "./App.css";
// import Webcam from "react-webcam";

// function App() {
//   const webcamRef = useRef(null);
//   const [finalEmotion, setFinalEmotion] = useState("Neutral");
//   const [finalPercentage, setFinalPercentage] = useState(0);

//   const detect = async () => {
//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null &&
//       webcamRef.current.video.readyState === 4
//     ) {
//       // Capture the current frame from the webcam
//       const video = webcamRef.current.video;
//       const imageSrc = webcamRef.current.getScreenshot();

//       // Websocket
//       var socket = new WebSocket("ws://localhost:8000");
//       var apiCall = {
//         event: "localhost:subscribe",
//         data: { image: imageSrc },
//       };

//       socket.onopen = () => socket.send(JSON.stringify(apiCall));
//       socket.onmessage = function (event) {
//         var pred_log = JSON.parse(event.data);
//         if (!pred_log.error) {
//           // Extract emotions and predictions
//           const predictions = pred_log["predictions"];
//           const emotions = Object.keys(predictions);
//           const values = emotions.map(emotion => predictions[emotion] * 100);

//           // Find the highest emotion
//           const maxIndex = values.indexOf(Math.max(...values));
//           const emotion = emotions[maxIndex];
//           const percentage = Math.round(values[maxIndex]);

//           // Set the final emotion and percentage
//           setFinalEmotion(emotion);
//           setFinalPercentage(percentage);
//         }
//       };
//     }
//   };

//   useEffect(() => {
//     const interval = setInterval(detect, 1000); // Detect emotions every second
//     return () => clearInterval(interval);
//   }, []);

//   return (
//     <div className="App">
//       <Webcam
//         ref={webcamRef}
//         style={{
//           position: "absolute",
//           marginLeft: "auto",
//           marginRight: "auto",
//           left: 0,
//           right: 600,
//           top: 20,
//           textAlign: "center",
//           zIndex: 9,
//           width: 640,
//           height: 480,
//         }}
//       />

//       <div className="Prediction" style={{ position: "absolute", right: 100, width: 500, top: 60 }}>
//         <label htmlFor="finalEmotionProgress" style={{ color: "black" }}>
//            Emotion : {finalEmotion} ({finalPercentage}%)
//         </label>
//         <progress id="finalEmotionProgress" value={finalPercentage} max="100">
//           {finalPercentage}%
//         </progress>
//         <br /><br />

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
// }

// export default App;


