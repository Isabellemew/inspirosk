import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, ZoomIn, ZoomOut, Check, RotateCcw } from "lucide-react";
import { useTranslation } from "../context/TranslationContext";

export default function AvatarCropper({ onCropComplete, onCancel }) {
  const { t } = useTranslation();
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fileName, setFileName] = useState("");

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const CROP_SIZE = 200; // Size of the crop square/circle

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(t("auth.avatar_size_error") || "Размер файла превышает 5 МБ!");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !imageSrc) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (!imageSrc || e.touches.length !== 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !imageSrc || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleZoom = (factor) => {
    setZoom((prev) => Math.max(0.5, Math.min(3, prev + factor)));
  };

  const handleCrop = () => {
    if (!imageSrc || !canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    // Draw cropped region on canvas
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    
    // We want to map the 200x200 viewport back to the image space
    // Center of viewport is CROP_SIZE / 2
    // Let's compute the position of the image on canvas
    const drawWidth = img.naturalWidth * zoom;
    const drawHeight = img.naturalHeight * zoom;
    
    // X, Y coordinate of top-left corner of the image relative to center of the crop circle
    // In viewport coords: (CROP_SIZE / 2) + offset.x - (drawWidth / 2)
    const x = (CROP_SIZE / 2) + offset.x - (drawWidth / 2);
    const y = (CROP_SIZE / 2) + offset.y - (drawHeight / 2);

    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    // Convert canvas content to base64 data URL
    const croppedDataUrl = canvas.toDataURL("image/png");
    onCropComplete(croppedDataUrl);
  };

  useEffect(() => {
    // Add global mouse up listener to handle drag release outside cropper
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="avatar-cropper-card" style={{ background: "var(--dash-card)", border: "1px solid var(--border-color)", borderRadius: 16, padding: 24, textAlign: "center" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
        {t("auth.step_avatar")}
      </h3>

      {!imageSrc ? (
        <div 
          className="cropper-upload-area" 
          style={{ 
            border: "2px dashed var(--border-color)", 
            borderRadius: 12, 
            padding: "40px 20px", 
            cursor: "pointer", 
            transition: "border-color 0.2s" 
          }}
          onClick={() => document.getElementById("avatar-file-input").click()}
        >
          <Upload size={36} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>
            Загрузить изображение
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            JPG / PNG до 5 МБ
          </p>
          <input 
            type="file" 
            id="avatar-file-input" 
            accept="image/png, image/jpeg, image/jpg" 
            onChange={handleFileChange} 
            style={{ display: "none" }} 
          />
        </div>
      ) : (
        <div>
          {/* Viewport container */}
          <div 
            ref={containerRef}
            className="cropper-viewport-container"
            style={{ 
              position: "relative", 
              width: "100%", 
              height: 250, 
              background: "#0d0e12", 
              borderRadius: 12, 
              overflow: "hidden", 
              cursor: "move",
              userSelect: "none"
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* The hidden image used for naturalWidth loading */}
            <img 
              ref={imageRef}
              src={imageSrc} 
              alt="Source" 
              style={{ 
                position: "absolute",
                display: "none"
              }} 
            />

            {/* Rendered image mapped dynamically */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                pointerEvents: "none"
              }}
            >
              <img 
                src={imageSrc} 
                alt="Preview" 
                style={{ 
                  display: "block",
                  maxHeight: 200,
                  maxWidth: "none"
                }} 
              />
            </div>

            {/* Circular crop mask overlay */}
            <div 
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
                border: "2px solid var(--primary)",
                borderRadius: "50%",
                width: CROP_SIZE,
                height: CROP_SIZE,
                margin: "auto",
                pointerEvents: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* Controls */}
          <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "16px 0" }}>
            <button type="button" className="btn-secondary" style={{ padding: 8 }} onClick={() => handleZoom(0.1)} title="Zoom In">
              <ZoomIn size={16} />
            </button>
            <button type="button" className="btn-secondary" style={{ padding: 8 }} onClick={() => handleZoom(-0.1)} title="Zoom Out">
              <ZoomOut size={16} />
            </button>
            <button type="button" className="btn-secondary" style={{ padding: 8 }} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} title="Reset">
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => { setImageSrc(null); setFileName(""); if (onCancel) onCancel(); }}
              style={{ flex: 1 }}
            >
              Сбросить
            </button>
            <button 
              type="button" 
              className="btn-apply" 
              onClick={handleCrop}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Check size={16} /> Обрезать & Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas to output cropped results */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
