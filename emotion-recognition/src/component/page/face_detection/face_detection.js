import React, { useCallback, useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import EmotionBreakdown from "../../common/EmotionBreakdown";
import FaceOverlay from "../../common/FaceOverlay";

const WS_URL = "ws://localhost:8000";
const DETECT_INTERVAL_MS = 400;

const RealFaceDetection = () => {
  const webcamRef = useRef(null);
  const socketRef = useRef(null);
  const pendingRef = useRef(false);
  const [faces, setFaces] = useState([]);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [statusMessage, setStatusMessage] = useState(
    "Point your face at the camera to begin."
  );

  // Keep a single WebSocket open for the whole session instead of
  // reconnecting for every frame — reconnecting each time added a full
  // handshake of latency per detection and made updates feel sluggish.
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer = null;

    const connect = () => {
      if (cancelled) return;

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        pendingRef.current = false;
        const pred_log = JSON.parse(event.data);
        setFrameSize({ width: pred_log.imageWidth, height: pred_log.imageHeight });
        setFaces(pred_log.faces || []);
        setStatusMessage(pred_log.error || "");
      };

      socket.onerror = (error) => console.error("WebSocket error:", error);

      socket.onclose = () => {
        pendingRef.current = false;
        if (!cancelled) reconnectTimer = setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, []);

  const detect = useCallback(() => {
    const socket = socketRef.current;
    if (
      pendingRef.current ||
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !webcamRef.current ||
      webcamRef.current.video.readyState !== 4
    ) {
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    pendingRef.current = true;
    socket.send(
      JSON.stringify({
        event: "localhost:subscribe",
        data: { image: imageSrc },
      })
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(detect, DETECT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detect]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 xl:flex-row xl:items-start">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg transition-colors dark:border-slate-800 dark:bg-slate-900 xl:max-w-xl xl:shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 className="font-semibold text-slate-800 dark:text-white">
                Live Camera
              </h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <div className="relative bg-slate-900">
              <Webcam
                ref={webcamRef}
                mirrored
                screenshotFormat="image/jpeg"
                className="w-full"
              />
              <FaceOverlay
                faces={faces}
                sourceWidth={frameSize.width}
                sourceHeight={frameSize.height}
              />
            </div>
            {(statusMessage || faces.length > 1) && (
              <p
                className={`border-t border-slate-100 px-5 py-3 text-sm dark:border-slate-800 ${
                  statusMessage
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {statusMessage || `${faces.length} faces detected`}
              </p>
            )}
          </div>

          <div className="w-full xl:flex-1">
            {faces.length === 0 ? (
              <div className="w-full max-w-sm">
                <EmotionBreakdown
                  emotion="—"
                  percentage={0}
                  predictions={null}
                  hint="Waiting for a face..."
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

export default RealFaceDetection;
