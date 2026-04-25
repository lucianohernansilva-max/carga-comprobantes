import { useNavigate } from 'react-router-dom'
import { Camera, TrendingUp, Calendar, FileText } from 'lucide-react'
import { useReceipts } from '../hooks/useReceipts'
import { formatCurrency } from '../utils/formatters'
import ReceiptCard from '../components/ReceiptCard'

export default function Home() {
  const navigate = useNavigate()
  const { receipts, totalAmount, thisMonthReceipts } = useReceipts()

  const recentReceipts = receipts.slice(0, 3)

  return (
    <div className="page">
      <div className="home-greeting">
        <h2>Mis comprobantes</h2>
        <p>Digitalizá y gestioná tus facturas fácilmente</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total registrado</div>
          <div className="stat-value blue" style={{ fontSize: '1.1rem' }}>
            {formatCurrency(totalAmount)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Este mes</div>
          <div className="stat-value green">{thisMonthReceipts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Comprobantes</div>
          <div className="stat-value">{receipts.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Este mes $</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>
            {formatCurrency(thisMonthReceipts.reduce((s, r) => s + (parseFloat(r.total) || 0), 0))}
          </div>
        </div>
      </div>

      <button className="cta-card" onClick={() => navigate('/capturar')}>
        <div className="cta-icon">
          <Camera size={24} />
        </div>
        <div className="cta-text">
          <h3>Nuevo comprobante</h3>
          <p>Fotografiá y registrá una factura</p>
        </div>
      </button>

      {recentReceipts.length > 0 && (
        <>
          <div className="section-title">Recientes</div>
          <div className="receipt-list">
            {recentReceipts.map(r => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
          {receipts.length > 3 && (
            <button
              className="btn btn-secondary w-full mt-4"
              onClick={() => navigate('/historial')}
            >
              Ver todos ({receipts.length})
            </button>
          )}
        </>
      )}

      {receipts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={28} />
          </div>
          <h3>Sin comprobantes aún</h3>
          <p>Tocá el botón de arriba para agregar tu primer comprobante</p>
        </div>
      )}
    </div>
  )
}
