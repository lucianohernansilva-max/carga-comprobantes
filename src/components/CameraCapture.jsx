import { useEffect, useRef } from 'react'
import { Camera, FlipHorizontal, RotateCcw, Upload, X } from 'lucide-react'
import { useCamera } from '../hooks/useCamera'

export default function CameraCapture({ onCapture, initialImage }) {
  const {
    videoRef, canvasRef, isActive, capturedImage, error,
    startCamera, stopCamera, capture, retake, flipCamera, handleFileSelect, setCapturedImage,
  } = useCamera()

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (initialImage) {
      setCapturedImage(initialImage)
    }
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage)
    }
  }, [capturedImage])

  if (error) {
    return (
      <div className="form-section">
        <p className="form-error" style={{ fontSize: '.85rem', padding: '8px 0' }}>
          <X size={16} /> {error}
        </p>
        <div className="camera-actions">
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Seleccionar foto
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />
      </div>
    )
  }

  if (capturedImage) {
    return (
      <div>
        <img src={capturedImage} alt="Foto del comprobante" className="captured-preview" />
        <div className="camera-actions">
          <button className="btn btn-secondary" onClick={retake}>
            <RotateCcw size={16} /> Retomar
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} /> Galería
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    )
  }

  if (isActive) {
    return (
      <div>
        <div className="camera-container">
          <video
            ref={videoRef}
            className="camera-video"
            autoPlay
            playsInline
            muted
          />
          <div className="camera-overlay">
            <div className="camera-frame" />
            <p className="camera-hint">Encuadrá el comprobante</p>
          </div>
        </div>
        <div className="camera-actions">
          <button className="btn btn-secondary btn-icon" onClick={flipCamera} title="Cambiar cámara">
            <FlipHorizontal size={18} />
          </button>
          <button className="btn btn-primary" onClick={capture}>
            <Camera size={18} /> Capturar
          </button>
          <button className="btn btn-secondary btn-icon" onClick={stopCamera} title="Cancelar">
            <X size={18} />
          </button>
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    )
  }

  return (
    <div>
      <div
        className="photo-placeholder"
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={28} />
        <span>Tocá para seleccionar foto</span>
        <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>o usá la cámara</span>
      </div>
      <div className="camera-actions" style={{ marginTop: '10px' }}>
        <button className="btn btn-primary" onClick={startCamera} style={{ flex: 1 }}>
          <Camera size={16} /> Abrir cámara
        </button>
        <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /> Galería
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileSelect(e.target.files?.[0])}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
