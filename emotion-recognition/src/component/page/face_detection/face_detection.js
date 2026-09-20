import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import Background from "../../backgorund/backgorun";
import Nav from "../../navbar/navbar";
import EmotionBreakdown from "../../common/EmotionBreakdown";

const WS_URL = "ws://localhost:8000";

const RealFaceDetection = () => {
  const webcamRef = useRef(null);
  const [finalEmotion, setFinalEmotion] = useState("Neutral");
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [predictions, setPredictions] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    "Point your face at the camera to begin."
  );

  const sendImageToServer = useCallback((imageSrc) => {
    const socket = new WebSocket(WS_URL);
    const apiCall = {
      event: "localhost:subscribe",
      data: { image: imageSrc },
    };

    socket.onopen = () => socket.send(JSON.stringify(apiCall));

    socket.onmessage = (event) => {
      const pred_log = JSON.parse(event.data);
      if (pred_log.error) {
        setStatusMessage(pred_log.error);
        setPredictions(null);
        return;
      }

      const predictionMap = pred_log["predictions"];
      const emotions = Object.keys(predictionMap);
      const values = emotions.map((emotion) => predictionMap[emotion] * 100);
      const maxIndex = values.indexOf(Math.max(...values));

      setStatusMessage("");
      setFinalEmotion(emotions[maxIndex]);
      setFinalPercentage(Math.round(values[maxIndex]));
      setPredictions(predictionMap);
    };

    socket.onerror = (error) => console.error("WebSocket error:", error);
  }, []);

  const detect = useCallback(() => {
    if (webcamRef.current && webcamRef.current.video.readyState === 4) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) sendImageToServer(imageSrc);
    }
  }, [sendImageToServer]);

  useEffect(() => {
    const interval = setInterval(detect, 1000);
    return () => clearInterval(interval);
  }, [detect]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <Background />
      <div className="relative z-10">
        <Nav />
        <main className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 pb-16 pt-10 lg:flex-row lg:items-start lg:justify-center">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 className="font-semibold text-slate-800 dark:text-white">
                Live Camera
              </h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <Webcam
              ref={webcamRef}
              mirrored
              screenshotFormat="image/jpeg"
              className="aspect-video w-full bg-slate-900 object-cover"
            />
            {statusMessage && (
              <p className="border-t border-slate-100 px-5 py-3 text-sm text-amber-600 dark:border-slate-800 dark:text-amber-400">
                {statusMessage}
              </p>
            )}
          </div>

          <EmotionBreakdown
            emotion={finalEmotion}
            percentage={finalPercentage}
            predictions={predictions}
            hint="Waiting for a face..."
          />
        </main>
      </div>
    </div>
  );
};

export default RealFaceDetection;
