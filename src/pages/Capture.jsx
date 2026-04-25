import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CheckCircle } from 'lucide-react'
import CameraCapture from '../components/CameraCapture'
import ReceiptForm from '../components/ReceiptForm'
import { useReceipts } from '../hooks/useReceipts'
import { generateId } from '../utils/storage'

export default function Capture() {
  const navigate = useNavigate()
  const { addReceipt } = useReceipts()
  const [photo, setPhoto] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(data) {
    setIsSubmitting(true)
    try {
      const receipt = {
        ...data,
        id: generateId(),
        foto: photo,
        createdAt: new Date().toISOString(),
      }
      const saved = addReceipt(receipt)
      setSaved(true)
      setTimeout(() => navigate(`/comprobante/${saved.id}`), 1200)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (saved) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <div style={{ width: 64, height: 64, background: 'var(--green-100)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green-600)' }}>
          <CheckCircle size={36} />
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>¡Comprobante guardado!</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '.9rem' }}>Redirigiendo...</p>
      </div>
    )
  }

  return (
    <div className="form-page">
      <div className="form-section">
        <div className="form-section-title">
          <Camera size={14} /> Foto del comprobante
        </div>
        <CameraCapture onCapture={setPhoto} />
      </div>

      <ReceiptForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  )
}
