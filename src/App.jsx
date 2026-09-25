import { useState, useCallback } from 'react'
import Header from './components/Header'
import ReceiptList from './components/ReceiptList'
import CameraCapture from './components/CameraCapture'
import ReviewForm from './components/ReviewForm'
import LoadingSpinner from './components/LoadingSpinner'
import { useLocalStorage } from './hooks/useLocalStorage'
import { extractReceiptData } from './services/anthropicService'
import { exportToExcel } from './services/excelService'

// View states
const VIEW = { LIST: 'list', CAMERA: 'camera', PROCESSING: 'processing', REVIEW: 'review' }

export default function App() {
  const [receipts, setReceipts] = useLocalStorage('receipts_session', [])
  const [view, setView] = useState(VIEW.LIST)
  const [capturedImage, setCapturedImage] = useState(null)
  const [ocrData, setOcrData] = useState(null)
  const [ocrError, setOcrError] = useState(null)

  const totalAmount = receipts.reduce((s, r) => s + (Number(r.importe_total) || 0), 0)

  const handleCapture = useCallback(async (dataURL) => {
    setCapturedImage(dataURL)
    setOcrError(null)
    setView(VIEW.PROCESSING)
    try {
      const data = await extractReceiptData(dataURL)
      setOcrData(data)
    } catch (err) {
      setOcrError(err.message ?? 'Error al analizar el comprobante.')
      setOcrData(null)
    }
    setView(VIEW.REVIEW)
  }, [])

  const handleConfirm = useCallback(
    (formData) => {
      const newReceipt = {
        id: crypto.randomUUID(),
        thumbnail: capturedImage,
        ...formData,
      }
      setReceipts((prev) => [newReceipt, ...prev])
      setCapturedImage(null)
      setOcrData(null)
      setView(VIEW.LIST)
    },
    [capturedImage, setReceipts]
  )

  const handleDiscard = useCallback(() => {
    setCapturedImage(null)
    setOcrData(null)
    setOcrError(null)
    setView(VIEW.LIST)
  }, [])

  const handleDelete = useCallback(
    (id) => {
      setReceipts((prev) => prev.filter((r) => r.id !== id))
    },
    [setReceipts]
  )

  const handleExport = useCallback(() => {
    if (receipts.length === 0) return
    exportToExcel(receipts)
  }, [receipts])

  const handleNewReceipt = useCallback(() => {
    setView(VIEW.CAMERA)
  }, [])

  if (view === VIEW.CAMERA) {
    return <CameraCapture onCapture={handleCapture} onCancel={() => setView(VIEW.LIST)} />
  }

  if (view === VIEW.PROCESSING) {
    return <LoadingSpinner message="Analizando comprobante con IA..." />
  }

  if (view === VIEW.REVIEW) {
    return (
      <ReviewForm
        imageDataURL={capturedImage}
        initialData={ocrError ? null : ocrData}
        ocrError={ocrError}
        onConfirm={handleConfirm}
        onDiscard={handleDiscard}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      <Header count={receipts.length} total={totalAmount} onExport={handleExport} />

      <ReceiptList receipts={receipts} onDelete={handleDelete} onAdd={handleNewReceipt} />

      {/* FAB */}
      <button
        onClick={handleNewReceipt}
        className="fixed bottom-6 right-4 w-16 h-16 bg-brand-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light active:scale-95 transition-transform z-10"
        aria-label="Agregar comprobante"
      >
        <PlusIcon />
      </button>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
