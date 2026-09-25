import { useRef, useEffect, useState, useCallback } from 'react'
import { compressImage } from '../utils/imageUtils'

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const fileInputRef = useRef(null)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraReady(true)
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Permitilo en la configuración del navegador.'
          : 'No se pudo acceder a la cámara. Podés subir una imagen desde la galería.'
      )
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [startCamera])

  const capturePhoto = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(
      async (blob) => {
        if (!blob) return
        const file = new File([blob], 'captura.jpg', { type: 'image/jpeg' })
        const dataURL = await compressImage(file)
        onCapture(dataURL)
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture])

  const handleFileChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const dataURL = await compressImage(file)
        onCapture(dataURL)
      } catch {
        setCameraError('No se pudo procesar la imagen seleccionada.')
      }
    },
    [onCapture]
  )

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 absolute top-0 inset-x-0 z-10">
        <button
          onClick={onCancel}
          className="text-white flex items-center gap-1.5 text-sm font-medium"
        >
          <ChevronLeftIcon />
          Cancelar
        </button>
        <span className="text-white text-sm font-medium">Nuevo comprobante</span>
        <div className="w-16" />
      </div>

      {/* Camera preview */}
      {!cameraError && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
      )}

      {/* Error state */}
      {cameraError && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
            <CameraOffIcon />
          </div>
          <p className="text-white text-sm">{cameraError}</p>
          <button
            onClick={startCamera}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Framing guide */}
      {cameraReady && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="border-2 border-dashed border-white/60 rounded-xl"
            style={{ width: '85%', height: '55%' }}
          />
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 pb-10 pt-6 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80">
        <p className="text-white/60 text-xs">Encuadrá el comprobante en el marco</p>
        <div className="flex items-center gap-8">
          {/* Gallery button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <GalleryIcon />
            </div>
            <span className="text-white text-xs">Galería</span>
          </button>

          {/* Capture button */}
          <button
            onClick={capturePhoto}
            disabled={!cameraReady}
            className="w-20 h-20 rounded-full bg-white disabled:opacity-50 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          >
            <div className="w-16 h-16 rounded-full border-4 border-gray-300" />
          </button>

          <div className="w-12 h-12" />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function CameraOffIcon() {
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 3l18 18M9.88 9.88a3 3 0 104.24 4.24M10.73 5H11a2 2 0 012 2v.27m3.27 3.27A9.98 9.98 0 0121 12c0 1.657-.402 3.22-1.118 4.573M3 12c0-2.76 1.12-5.26 2.93-7.07" />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}
