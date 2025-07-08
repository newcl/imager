import { useRef, useState, useEffect } from 'react'
import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [imageObj, setImageObj] = useState(null)
  const fileInputRef = useRef()
  const canvasRef = useRef()
  const [cropRect, setCropRect] = useState(null)
  const [isCropping, setIsCropping] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 });
  const [draggingCrop, setDraggingCrop] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 700 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [spacePressed, setSpacePressed] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImage(ev.target.result)
        setCropRect(null)
        setStartPoint(null)
        setBrightness(100)
        setContrast(100)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    if (image) {
      const img = new window.Image()
      img.onload = () => setImageObj(img)
      img.src = image
    } else {
      setImageObj(null)
    }
  }, [image])

  useEffect(() => {
    if (imageObj && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      canvas.width = imageObj.width
      canvas.height = imageObj.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imageObj, 0, 0)
    }
  }, [imageObj])

  // Mouse wheel zoom handler
  const handleCanvasWheel = (e) => {
    if (!imageObj) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
    let newZoom = zoom * (e.deltaY < 0 ? 1.1 : 0.9);
    newZoom = Math.max(0.2, Math.min(5, newZoom));
    // Adjust origin so zoom centers on mouse
    setZoomOrigin((prev) => ({
      x: (mouseX - prev.x) - (mouseX - prev.x) * (newZoom / zoom) + prev.x,
      y: (mouseY - prev.y) - (mouseY - prev.y) * (newZoom / zoom) + prev.y,
    }));
    setZoom(newZoom);
  };

  // Responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth * 0.9, 1600);
      const h = Math.min(window.innerHeight * 0.7, 900);
      setCanvasSize({ width: Math.round(w), height: Math.round(h) });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Utility to get mouse position relative to canvas, accounting for CSS scaling and zoom/pan
  const getCanvasMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    // Adjust for pan and zoom
    return {
      x: (x - zoomOrigin.x) / zoom,
      y: (y - zoomOrigin.y) / zoom,
    };
  };

  // Helper to check if mouse is inside crop area
  const isInCropRect = (pos) => {
    if (!cropRect) return false;
    return (
      pos.x >= cropRect.x &&
      pos.x <= cropRect.x + cropRect.w &&
      pos.y >= cropRect.y &&
      pos.y <= cropRect.y + cropRect.h
    );
  };

  // Keyboard events for spacebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') setSpacePressed(true);
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Mouse events for panning
  const handleCanvasMouseDown = (e) => {
    if (!imageObj) return;
    const pos = getCanvasMousePos(e);
    if (spacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, origin: { ...zoomOrigin } });
    } else if (cropRect && isInCropRect(pos)) {
      setDraggingCrop(true);
      setDragOffset({ x: pos.x - cropRect.x, y: pos.y - cropRect.y });
    } else {
      setIsCropping(true);
      setStartPoint(pos);
      setCropRect(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    const pos = getCanvasMousePos(e);
    if (isPanning && panStart) {
      // Move image
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      let newX = panStart.origin.x + dx;
      let newY = panStart.origin.y + dy;
      // Clamp so image cannot be moved completely out of view
      const minX = Math.min(0, canvasSize.width - imageObj.width * zoom);
      const minY = Math.min(0, canvasSize.height - imageObj.height * zoom);
      const maxX = Math.max(0, canvasSize.width - imageObj.width * zoom);
      const maxY = Math.max(0, canvasSize.height - imageObj.height * zoom);
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));
      setZoomOrigin({ x: newX, y: newY });
    } else if (draggingCrop && cropRect) {
      // Move crop rect
      let newX = pos.x - dragOffset.x;
      let newY = pos.y - dragOffset.y;
      // Clamp to image bounds
      newX = Math.max(0, Math.min(newX, imageObj.width - cropRect.w));
      newY = Math.max(0, Math.min(newY, imageObj.height - cropRect.h));
      setCropRect({ ...cropRect, x: newX, y: newY });
    } else if (isCropping && startPoint) {
      setCropRect({
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        w: Math.abs(pos.x - startPoint.x),
        h: Math.abs(pos.y - startPoint.y),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsCropping(false);
    setDraggingCrop(false);
    setIsPanning(false);
  };

  // Draw image, overlays, and crop rectangle with zoom, always on canvasSize
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      if (imageObj) {
        ctx.save();
        ctx.translate(zoomOrigin.x, zoomOrigin.y);
        ctx.scale(zoom, zoom);
        ctx.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height);
        ctx.restore();
      }
      if (cropRect) {
        ctx.save();
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 2;
        ctx.setLineDash([6]);
        ctx.strokeRect(cropRect.x * zoom + zoomOrigin.x, cropRect.y * zoom + zoomOrigin.y, cropRect.w * zoom, cropRect.h * zoom);
        ctx.restore();
        // Dim outside crop area
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        // Top
        ctx.fillRect(0, 0, canvasSize.width, cropRect.y * zoom + zoomOrigin.y);
        // Bottom
        ctx.fillRect(0, cropRect.y * zoom + zoomOrigin.y + cropRect.h * zoom, canvasSize.width, canvasSize.height - (cropRect.y * zoom + zoomOrigin.y + cropRect.h * zoom));
        // Left
        ctx.fillRect(0, cropRect.y * zoom + zoomOrigin.y, cropRect.x * zoom + zoomOrigin.x, cropRect.h * zoom);
        // Right
        ctx.fillRect(cropRect.x * zoom + zoomOrigin.x + cropRect.w * zoom, cropRect.y * zoom + zoomOrigin.y, canvasSize.width - (cropRect.x * zoom + zoomOrigin.x + cropRect.w * zoom), cropRect.h * zoom);
        ctx.restore();
      }
    }
  }, [imageObj, cropRect, zoom, zoomOrigin, canvasSize]);

  // Reset zoom on new image
  useEffect(() => {
    setZoom(1);
    setZoomOrigin({ x: 0, y: 0 });
  }, [image]);

  // Crop function: map cropRect (canvas coords) to image coords
  const handleCrop = () => {
    if (!cropRect || !canvasRef.current || !imageObj) return;
    // Map cropRect from canvas to image coordinates
    const imgX = Math.round(cropRect.x);
    const imgY = Math.round(cropRect.y);
    const imgW = Math.round(cropRect.w);
    const imgH = Math.round(cropRect.h);
    // Create a temp canvas to get the correct image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imgW;
    tempCanvas.height = imgH;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(imageObj, imgX, imgY, imgW, imgH, 0, 0, imgW, imgH);
    const croppedDataUrl = tempCanvas.toDataURL();
    setImage(croppedDataUrl);
    setCropRect(null);
    setStartPoint(null);
    // Center the cropped image
    setZoom(1);
    setZoomOrigin({
      x: (canvasSize.width - imgW) / 2,
      y: (canvasSize.height - imgH) / 2,
    });
  };

  // Filter functions
  const applyFilter = (type) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      if (type === 'grayscale') {
        const avg = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = data[i + 1] = data[i + 2] = avg;
      } else if (type === 'sepia') {
        data[i] = Math.min(0.393 * r + 0.769 * g + 0.189 * b, 255);
        data[i + 1] = Math.min(0.349 * r + 0.686 * g + 0.168 * b, 255);
        data[i + 2] = Math.min(0.272 * r + 0.534 * g + 0.131 * b, 255);
      } else if (type === 'invert') {
        data[i] = 255 - r;
        data[i + 1] = 255 - g;
        data[i + 2] = 255 - b;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Update image state for further edits
    setImage(canvas.toDataURL());
  };

  // Apply brightness and contrast
  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageObj, 0, 0);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    // Brightness
    const b = brightness / 100;
    // Contrast
    const c = contrast / 100;
    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      data[i] = Math.min(255, data[i] * b);
      data[i + 1] = Math.min(255, data[i + 1] * b);
      data[i + 2] = Math.min(255, data[i + 2] * b);
      // Contrast
      data[i] = Math.min(255, ((data[i] - 128) * c + 128));
      data[i + 1] = Math.min(255, ((data[i + 1] - 128) * c + 128));
      data[i + 2] = Math.min(255, ((data[i + 2] - 128) * c + 128));
    }
    ctx.putImageData(imageData, 0, 0);
  }, [imageObj, brightness, contrast]);

  const handleBrightness = (e) => setBrightness(Number(e.target.value));
  const handleContrast = (e) => setContrast(Number(e.target.value));

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // When image or canvas size changes, fit and center image
  useEffect(() => {
    if (!imageObj) return;
    // Calculate best fit zoom
    const scaleX = canvasSize.width / imageObj.width;
    const scaleY = canvasSize.height / imageObj.height;
    const fitZoom = Math.min(scaleX, scaleY, 1);
    setZoom(fitZoom);
    setZoomOrigin({
      x: (canvasSize.width - imageObj.width * fitZoom) / 2,
      y: (canvasSize.height - imageObj.height * fitZoom) / 2,
    });
  }, [imageObj, canvasSize.width, canvasSize.height]);

  return (
    <div className="editor-container">
      <h1>Simple Image Editor</h1>
      <div className="canvas-section">
        {imageObj ? (
          <canvas
            ref={canvasRef}
            className="main-image"
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleCanvasWheel}
            style={{ cursor: spacePressed ? (isPanning ? 'grabbing' : 'grab') : (imageObj ? 'crosshair' : 'default'), width: '100%', height: '100%' }}
          />
        ) : (
          <div className="placeholder">No image uploaded</div>
        )}
      </div>
      <div className="toolbar">
        <button onClick={handleCrop} disabled={!cropRect}>Crop</button>
        <button onClick={() => applyFilter('grayscale')} disabled={!imageObj}>Grayscale</button>
        <button onClick={() => applyFilter('sepia')} disabled={!imageObj}>Sepia</button>
        <button onClick={() => applyFilter('invert')} disabled={!imageObj}>Invert</button>
        <div className="slider-group">
          <label htmlFor="brightness-slider">Brightness</label>
          <input id="brightness-slider" type="range" min="0" max="200" value={brightness} onChange={handleBrightness} disabled={!imageObj} />
        </div>
        <div className="slider-group">
          <label htmlFor="contrast-slider">Contrast</label>
          <input id="contrast-slider" type="range" min="0" max="200" value={contrast} onChange={handleContrast} disabled={!imageObj} />
        </div>
        <button onClick={handleDownload} disabled={!imageObj}>Download</button>
      </div>
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <button className="upload-btn" onClick={() => fileInputRef.current.click()}>Upload Image</button>
      </div>
    </div>
  )
}

export default App
