import { useEffect, useRef } from "react";

const BOX_COLOR = "#10b981";
const TEXT_COLOR = "#022c22";

const FaceOverlay = ({ faces = [], sourceWidth, sourceHeight }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceWidth || !sourceHeight) return;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = Math.max(14, sourceWidth / 45);
    ctx.lineWidth = Math.max(2, sourceWidth / 250);
    ctx.font = `600 ${fontSize}px sans-serif`;

    faces.forEach(({ box, emotion }) => {
      ctx.strokeStyle = BOX_COLOR;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      const paddingX = 6;
      const labelHeight = fontSize + 8;
      const textWidth = ctx.measureText(emotion).width;
      const labelY = Math.max(labelHeight, box.y);

      ctx.fillStyle = BOX_COLOR;
      ctx.fillRect(box.x, labelY - labelHeight, textWidth + paddingX * 2, labelHeight);

      ctx.fillStyle = TEXT_COLOR;
      ctx.textBaseline = "bottom";
      ctx.fillText(emotion, box.x + paddingX, labelY - 4);
    });
  }, [faces, sourceWidth, sourceHeight]);

  if (!sourceWidth || !sourceHeight) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};

export default FaceOverlay;
