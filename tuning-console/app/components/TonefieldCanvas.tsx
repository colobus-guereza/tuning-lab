"use client";

import { useRef, useEffect } from "react";

interface HitPointData {
  id?: string;
  tonic: number;
  octave: number;
  fifth: number;
  tuning_target: 'tonic' | 'octave' | 'fifth';
  primary_target?: 'tonic' | 'octave' | 'fifth';
  auxiliary_target?: 'tonic' | 'octave' | 'fifth' | null;
  is_compound?: boolean;
  target_display?: string;
  coordinate_x: number;
  coordinate_y: number;
  strength: number;
  hit_count: number;
  location: string;
  intent: string;
  hammering_type?: 'SNAP' | 'PULL' | 'PRESS' | null;
}

interface TonefieldCanvasProps {
  selectedCoords: Array<{ x: number; y: number }>;
  onCoordClick: (x: number, y: number) => void;
  hitPointCoord?: { x: number; y: number } | null;
  hitPointLocation?: "internal" | "external" | null;
  selectedHitPoint?: HitPointData | null;
  calculatedForce?: number | null;
  calculatedCount?: number | null;
  calculatedHammeringType?: "SNAP" | "PULL" | "PRESS" | null;
}

export default function TonefieldCanvas({
  selectedCoords,
  onCoordClick,
  hitPointCoord,
  hitPointLocation,
  selectedHitPoint,
  calculatedForce,
  calculatedCount,
  calculatedHammeringType,
}: TonefieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number>(0);

  const CANVAS_SIZE = 600;
  const PADDING = 50;
  const FIELD_SIZE = CANVAS_SIZE - 2 * PADDING;

  // 강도 값을 색상으로 변환 (음수=파랑, 양수=빨강)
  const getStrengthColor = (strength: number): { rgb: string; rgba: (opacity: number) => string } => {
    // 강도의 절댓값을 기준으로 채도 계산
    const absStrength = Math.abs(strength);
    // 0~20 범위로 정규화 (더 넓은 범위의 강도 표현)
    const intensity = Math.min(absStrength / 20, 1);

    // 채도: 강도가 높을수록 선명 (50% ~ 100%)
    const saturation = 50 + intensity * 50;

    // 밝기: 강도가 높을수록 진함
    // 약한 강도 (intensity 0): 밝음 (70%)
    // 강한 강도 (intensity 1): 어두움 (35%)
    const lightness = 70 - intensity * 35;

    // 음수는 파란색(220°), 양수는 빨간색(0°)
    const hue = strength < 0 ? 220 : 0;

    return {
      rgb: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      rgba: (opacity: number) => `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`
    };
  };

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

    // Draw ellipse (tonefield) with location-based color
    const a = 0.6; // short axis
    const b = 0.85; // long axis

    // Determine current location: prioritize selectedHitPoint, fallback to hitPointLocation
    const currentLocation = selectedHitPoint
      ? selectedHitPoint.location
      : hitPointLocation;

    // Location-based colors: internal = blue, external = red
    const tonefieldFill = currentLocation === "external"
      ? "rgba(220, 38, 38, 0.2)"  // red-600 with low opacity
      : "rgba(37, 99, 235, 0.2)";   // blue with low opacity

    const tonefieldStroke = currentLocation === "external"
      ? "#dc2626"  // red-600
      : "#2563eb"; // blue-600

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
    ctx.fillStyle = tonefieldFill;
    ctx.fill();
    ctx.strokeStyle = tonefieldStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw dimple ellipse (smaller ellipse with same aspect ratio)
    const dimpleScale = 0.4; // 40% of main ellipse
    const dimpleA = a * dimpleScale;
    const dimpleB = b * dimpleScale;

    const dimpleFill = currentLocation === "external"
      ? "rgba(220, 38, 38, 0.35)"  // red-600 with higher opacity
      : "rgba(37, 99, 235, 0.35)";   // blue with higher opacity

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
    ctx.fillStyle = dimpleFill;
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

    // Draw hit point coordinate marker with location-based color
    if (hitPointCoord) {
      const canvasX = coordToCanvas(hitPointCoord.x, "x");
      const canvasY = coordToCanvas(hitPointCoord.y, "y");

      // Location-based colors: internal = red (상향), external = blue (하향)
      const markerColor = hitPointLocation === "internal" ? "#dc2626" : "#2563eb"; // internal=red-600 : external=blue-600
      const markerOutlineColor = hitPointLocation === "internal" ? "#b91c1c" : "#1d4ed8"; // internal=red-700 : external=blue-700

      // Draw circle with outline
      ctx.fillStyle = markerColor;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 7, 0, 2 * Math.PI);
      ctx.fill();

      // Add outline for better visibility
      ctx.strokeStyle = markerOutlineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw calculated force × count label if available
      if (calculatedForce !== null && calculatedCount !== null) {
        // Korean translation mapping
        const hammeringTypeMap: Record<"SNAP" | "PULL" | "PRESS", string> = {
          SNAP: "튕겨치기",
          PULL: "당겨치기",
          PRESS: "눌러치기"
        };

        const hammeringText = calculatedHammeringType
          ? ` (${hammeringTypeMap[calculatedHammeringType]})`
          : "";
        const labelText = `${calculatedForce} × ${calculatedCount}${hammeringText}`;

        // Position label to the right-top of the marker
        const labelX = canvasX + 15;
        const labelY = canvasY - 8;

        // Draw semi-transparent background for better readability
        ctx.font = "bold 16px Arial";
        const textMetrics = ctx.measureText(labelText);
        const padding = 6;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 24;

        ctx.fillStyle = isDark ? "rgba(31, 41, 55, 0.9)" : "rgba(255, 255, 255, 0.9)"; // gray-800 : white
        ctx.fillRect(labelX - padding, labelY - bgHeight + padding, bgWidth, bgHeight);

        // Draw border
        ctx.strokeStyle = isDark ? "#6b7280" : "#9ca3af"; // gray-500 : gray-400
        ctx.lineWidth = 1.5;
        ctx.strokeRect(labelX - padding, labelY - bgHeight + padding, bgWidth, bgHeight);

        // Draw text
        ctx.fillStyle = isDark ? "#f9fafb" : "#1f2937"; // gray-50 : gray-800
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(labelText, labelX, labelY - bgHeight + padding + 3);
      }
    }

    // Draw selected hit point from recent list with animation
    if (selectedHitPoint) {
      const canvasX = coordToCanvas(selectedHitPoint.coordinate_x, "x");
      const canvasY = coordToCanvas(selectedHitPoint.coordinate_y, "y");

      // Calculate animation progress
      const elapsed = Date.now() - animationStartRef.current;
      const duration = 2000; // 2 seconds for one full cycle
      const progress = (elapsed % duration) / duration;

      // Pulse animation for the ring
      const pulseScale = 1 + Math.sin(progress * Math.PI * 2) * 0.3; // oscillate between 0.7 and 1.3
      const pulseOpacity = 0.6 + Math.sin(progress * Math.PI * 2) * 0.4; // oscillate between 0.2 and 1.0

      // Get color based on strength (heat map)
      const strengthColor = getStrengthColor(selectedHitPoint.strength);

      // Location-based colors for outer ring: internal = red (상향), external = blue (하향)
      const locationColor = selectedHitPoint.location === "internal" ? "#dc2626" : "#2563eb"; // internal=red-600 : external=blue-600

      // Draw animated outer ring with location-based color
      ctx.strokeStyle = `${locationColor}${Math.floor(pulseOpacity * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 14 * pulseScale, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw middle ring with strength-based color (pulsing)
      ctx.strokeStyle = strengthColor.rgba(pulseOpacity);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 10 * pulseScale, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw static inner circle with strength-based color
      ctx.fillStyle = strengthColor.rgb;
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 7, 0, 2 * Math.PI);
      ctx.fill();

      // Draw hit point information in quadrants
      const textColor = isDark ? "#d1d5db" : "#374151"; // gray-300 : gray-700
      const labelColor = isDark ? "#9ca3af" : "#6b7280"; // gray-400 : gray-500
      const primaryColor = "#dc2626"; // red-600 for 주 (primary)
      const auxiliaryColor = "#ea580c"; // orange-600 for 보조 (auxiliary)

      // 1st Quadrant (Top-Left): Tuning Errors (top to bottom: 5도, 옥타브, 토닉)
      ctx.font = "14px Arial";
      ctx.textAlign = "left";

      let yPos = PADDING + 20;

      // Fifth (top position)
      const fifthColor = selectedHitPoint.primary_target === "fifth"
        ? primaryColor
        : selectedHitPoint.auxiliary_target === "fifth"
        ? auxiliaryColor
        : textColor;
      const fifthFont = (selectedHitPoint.primary_target === "fifth" || selectedHitPoint.auxiliary_target === "fifth")
        ? "bold 14px Arial"
        : "14px Arial";
      ctx.fillStyle = fifthColor;
      ctx.font = fifthFont;
      ctx.fillText(`${selectedHitPoint.fifth >= 0 ? '+' : ''}${Number(selectedHitPoint.fifth).toFixed(1)}`, PADDING + 10, yPos);
      yPos += 20;

      // Octave (middle position)
      const octaveColor = selectedHitPoint.primary_target === "octave"
        ? primaryColor
        : selectedHitPoint.auxiliary_target === "octave"
        ? auxiliaryColor
        : textColor;
      const octaveFont = (selectedHitPoint.primary_target === "octave" || selectedHitPoint.auxiliary_target === "octave")
        ? "bold 14px Arial"
        : "14px Arial";
      ctx.fillStyle = octaveColor;
      ctx.font = octaveFont;
      ctx.fillText(`${selectedHitPoint.octave >= 0 ? '+' : ''}${Number(selectedHitPoint.octave).toFixed(1)}`, PADDING + 10, yPos);
      yPos += 20;

      // Tonic (bottom position)
      const tonicColor = selectedHitPoint.primary_target === "tonic"
        ? primaryColor
        : selectedHitPoint.auxiliary_target === "tonic"
        ? auxiliaryColor
        : textColor;
      const tonicFont = (selectedHitPoint.primary_target === "tonic" || selectedHitPoint.auxiliary_target === "tonic")
        ? "bold 14px Arial"
        : "14px Arial";
      ctx.fillStyle = tonicColor;
      ctx.font = tonicFont;
      ctx.fillText(`${selectedHitPoint.tonic >= 0 ? '+' : ''}${Number(selectedHitPoint.tonic).toFixed(1)}`, PADDING + 10, yPos);
      yPos += 20;

      // Tuning target and intent (4th line)
      // Use target_display if available (for compound targets), otherwise fall back to tuning_target
      const targetText = selectedHitPoint.target_display
                       || (selectedHitPoint.tuning_target === "tonic" ? "토닉"
                         : selectedHitPoint.tuning_target === "octave" ? "옥타브"
                         : "5도");
      ctx.fillStyle = textColor;
      ctx.font = "13px Arial";
      ctx.fillText(`${targetText} ${selectedHitPoint.intent}`, PADDING + 10, yPos);

      // 2nd Quadrant (Top-Right): Location, Coordinates, Strength, Hit Count (simplified - no labels)
      ctx.font = "13px Arial";
      ctx.textAlign = "right";
      ctx.fillStyle = textColor;

      yPos = PADDING + 20;
      ctx.fillText(`${selectedHitPoint.location === "internal" ? "내부" : "외부"}`, CANVAS_SIZE - PADDING - 10, yPos);
      yPos += 18;
      ctx.fillText(`(${selectedHitPoint.coordinate_x.toFixed(2)}, ${selectedHitPoint.coordinate_y.toFixed(2)})`, CANVAS_SIZE - PADDING - 10, yPos);
      yPos += 18;

      // Add hammering type to strength × count display
      const hammeringTypeMap: Record<"SNAP" | "PULL" | "PRESS", string> = {
        SNAP: "튕겨치기",
        PULL: "당겨치기",
        PRESS: "눌러치기"
      };
      const hammeringText = selectedHitPoint.hammering_type
        ? ` (${hammeringTypeMap[selectedHitPoint.hammering_type]})`
        : "";
      ctx.fillText(`${selectedHitPoint.strength >= 0 ? '+' : ''}${selectedHitPoint.strength} × ${selectedHitPoint.hit_count}${hammeringText}`, CANVAS_SIZE - PADDING - 10, yPos);

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
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (selectedHitPoint) {
      // Start animation when a hit point is selected
      animationStartRef.current = Date.now();

      const animate = () => {
        drawTonefield();
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();
    } else {
      // Just draw once if no animation needed
      drawTonefield();
    }

    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedCoords, hitPointCoord, hitPointLocation, selectedHitPoint, calculatedForce, calculatedCount, calculatedHammeringType]);

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
