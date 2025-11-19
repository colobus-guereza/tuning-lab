"use client";

import { useRef, useEffect } from "react";

interface TonefieldCanvasProps {
  selectedCoords: Array<{ x: number; y: number }>;
  onCoordClick: (x: number, y: number) => void;
  hitPointCoord?: { x: number; y: number } | null;
}

export default function TonefieldCanvas({
  selectedCoords,
  onCoordClick,
  hitPointCoord,
}: TonefieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CANVAS_SIZE = 600;
  const PADDING = 50;
  const FIELD_SIZE = CANVAS_SIZE - 2 * PADDING;

  // Convert coordinate space [-1, 1] to canvas pixels
  const coordToCanvas = (coord: number, axis: "x" | "y"): number => {
    if (axis === "x") {
      return PADDING + ((coord + 1) / 2) * FIELD_SIZE;
    } else {
      // Y axis is inverted in canvas
      return PADDING + ((1 - coord) / 2) * FIELD_SIZE;
    }
  };

  // Convert canvas pixels to coordinate space [-1, 1]
  const canvasToCoord = (pixel: number, axis: "x" | "y"): number => {
    if (axis === "x") {
      return ((pixel - PADDING) / FIELD_SIZE) * 2 - 1;
    } else {
      // Y axis is inverted in canvas
      return 1 - ((pixel - PADDING) / FIELD_SIZE) * 2;
    }
  };

  const drawTonefield = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check dark mode
    const isDark = document.documentElement.classList.contains("dark");

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = isDark ? "#1f2937" : "white"; // gray-800 : white
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw square boundary
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 3;
    ctx.strokeRect(PADDING, PADDING, FIELD_SIZE, FIELD_SIZE);

    // Draw axes
    ctx.strokeStyle = isDark ? "#9ca3af" : "black"; // gray-400 : black
    ctx.lineWidth = 2;

    // X axis
    ctx.beginPath();
    ctx.moveTo(PADDING, coordToCanvas(0, "y"));
    ctx.lineTo(PADDING + FIELD_SIZE, coordToCanvas(0, "y"));
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(coordToCanvas(0, "x"), PADDING);
    ctx.lineTo(coordToCanvas(0, "x"), PADDING + FIELD_SIZE);
    ctx.stroke();

    // Draw ellipse (tonefield)
    const a = 0.6; // short axis
    const b = 0.85; // long axis

    ctx.beginPath();
    ctx.ellipse(
      coordToCanvas(0, "x"),
      coordToCanvas(0, "y"),
      (a / 2) * FIELD_SIZE,
      (b / 2) * FIELD_SIZE,
      0,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "rgba(173, 216, 230, 0.3)";
    ctx.fill();
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw dimple ellipse (smaller ellipse with same aspect ratio)
    const dimpleScale = 0.4; // 40% of main ellipse
    const dimpleA = a * dimpleScale;
    const dimpleB = b * dimpleScale;

    ctx.beginPath();
    ctx.ellipse(
      coordToCanvas(0, "x"),
      coordToCanvas(0, "y"),
      (dimpleA / 2) * FIELD_SIZE,
      (dimpleB / 2) * FIELD_SIZE,
      0,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "rgba(173, 216, 230, 0.5)"; // Slightly darker fill
    ctx.fill();
    ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af"; // gray-500 : gray-400
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw origin
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(coordToCanvas(0, "x"), coordToCanvas(0, "y"), 5, 0, 2 * Math.PI);
    ctx.fill();

    // Draw grid lines (optional)
    ctx.strokeStyle = isDark
      ? "rgba(156, 163, 175, 0.2)"
      : "rgba(200, 200, 200, 0.3)";
    ctx.lineWidth = 1;
    for (let i = -0.8; i <= 0.8; i += 0.2) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(coordToCanvas(i, "x"), PADDING);
      ctx.lineTo(coordToCanvas(i, "x"), PADDING + FIELD_SIZE);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(PADDING, coordToCanvas(i, "y"));
      ctx.lineTo(PADDING + FIELD_SIZE, coordToCanvas(i, "y"));
      ctx.stroke();
    }

    // Draw axis labels
    ctx.fillStyle = isDark ? "#d1d5db" : "black"; // gray-300 : black
    ctx.font = "14px Arial";
    ctx.textAlign = "center";

    // X axis labels
    ctx.fillText("-1", PADDING, PADDING + FIELD_SIZE + 25);
    ctx.fillText("0", coordToCanvas(0, "x"), PADDING + FIELD_SIZE + 25);
    ctx.fillText("1", PADDING + FIELD_SIZE, PADDING + FIELD_SIZE + 25);

    // Y axis labels
    ctx.textAlign = "right";
    ctx.fillText("1", PADDING - 10, PADDING + 5);
    ctx.fillText("0", PADDING - 10, coordToCanvas(0, "y") + 5);
    ctx.fillText("-1", PADDING - 10, PADDING + FIELD_SIZE + 5);

    // Draw selected coordinates
    selectedCoords.forEach((coord, index) => {
      const canvasX = coordToCanvas(coord.x, "x");
      const canvasY = coordToCanvas(coord.y, "y");

      // Draw green X marker
      ctx.strokeStyle = "green";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(canvasX - 8, canvasY - 8);
      ctx.lineTo(canvasX + 8, canvasY + 8);
      ctx.moveTo(canvasX + 8, canvasY - 8);
      ctx.lineTo(canvasX - 8, canvasY + 8);
      ctx.stroke();

      // Draw index number
      ctx.fillStyle = "green";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(String(index + 1), canvasX, canvasY - 12);
    });

    // Draw hit point coordinate marker
    if (hitPointCoord) {
      const canvasX = coordToCanvas(hitPointCoord.x, "x");
      const canvasY = coordToCanvas(hitPointCoord.y, "y");

      // Draw simple solid circle marker
      ctx.fillStyle = "#2563eb"; // blue-600
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Account for canvas scaling (CSS size vs internal size)
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    // Get click position relative to canvas and scale to internal coordinates
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;

    // Convert to coordinate space
    const x = canvasToCoord(canvasX, "x");
    const y = canvasToCoord(canvasY, "y");

    // Only allow clicks within bounds [-1, 1]
    if (x >= -1 && x <= 1 && y >= -1 && y <= 1) {
      onCoordClick(x, y);
    }
  };

  useEffect(() => {
    drawTonefield();
  }, [selectedCoords, hitPointCoord]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      onClick={handleCanvasClick}
      className="border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair mx-auto block transition-colors"
      style={{ maxWidth: "100%" }}
    />
  );
}
