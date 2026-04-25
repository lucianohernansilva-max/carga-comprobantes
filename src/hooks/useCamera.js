import { useState, useRef, useCallback } from 'react'

export function useCamera() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setIsActive(true)
      setCapturedImage(null)
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilitalo en la configuración.'
          : err.name === 'NotFoundError'
          ? 'No se encontró cámara en este dispositivo.'
          : `Error al acceder a la cámara: ${err.message}`
      )
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsActive(false)
  }, [])

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
    stopCamera()
    return dataUrl
  }, [stopCamera])

  const retake = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const flipCamera = useCallback(() => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'))
  }, [])

  const handleFileSelect = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setCapturedImage(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  return {
    videoRef,
    canvasRef,
    isActive,
    capturedImage,
    error,
    facingMode,
    startCamera,
    stopCamera,
    capture,
    retake,
    flipCamera,
    handleFileSelect,
    setCapturedImage,
  }
}
