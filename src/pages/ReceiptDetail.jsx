import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, ArrowLeft, Image } from 'lucide-react'
import { getReceipt } from '../utils/storage'
import { useReceipts } from '../hooks/useReceipts'
import {
  getTipoInfo, getBadgeClass, formatCurrency, formatDate, formatComprobanteNum
} from '../utils/formatters'

export default function ReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deleteReceipt } = useReceipts()
  const [showPhoto, setShowPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const receipt = getReceipt(id)

  if (!receipt) {
    return (
      <div className="page">
        <div className="empty-state">
          <h3>Comprobante no encontrado</h3>
          <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>
            Ir al inicio
          </button>
        </div>
      </div>
    )
  }

  const tipo = getTipoInfo(receipt.tipo)
  const badgeClass = getBadgeClass(tipo.type)

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteReceipt(id)
    navigate('/historial')
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-secondary btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: '.85rem', color: 'var(--gray-500)', fontWeight: 500 }}>
          Detalle
        </span>
      </div>

      <div className="detail-section" style={{ background: 'var(--blue-800)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`receipt-type-badge ${badgeClass}`} style={{ width: 56, height: 56, fontSize: '.85rem' }}>
            {tipo.badge}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{receipt.razonSocial || 'Sin razón social'}</div>
            <div style={{ fontSize: '.8rem', opacity: .8, marginTop: 2 }}>
              {tipo.label} · {formatDate(receipt.fecha)}
            </div>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', textAlign: 'right' }}>
            {formatCurrency(receipt.total)}
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="form-section-title" style={{ marginBottom: 10 }}>Comprobante</div>
        <div className="detail-row">
          <span className="detail-key">Número</span>
          <span className="detail-val">{formatComprobanteNum(receipt.puntoVenta, receipt.numeroComprobante)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Fecha</span>
          <span className="detail-val">{formatDate(receipt.fecha)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Tipo</span>
          <span className="detail-val">{tipo.label}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="form-section-title" style={{ marginBottom: 10 }}>Emisor</div>
        <div className="detail-row">
          <span className="detail-key">CUIT</span>
          <span className="detail-val">{receipt.cuitEmisor || '-'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">Razón social</span>
          <span className="detail-val">{receipt.razonSocial || '-'}</span>
        </div>
        {receipt.domicilioEmisor && (
          <div className="detail-row">
            <span className="detail-key">Domicilio</span>
            <span className="detail-val">{receipt.domicilioEmisor}</span>
          </div>
        )}
      </div>

      <div className="detail-section">
        <div className="form-section-title" style={{ marginBottom: 10 }}>Importes</div>
        <div className="detail-row">
          <span className="detail-key">Neto gravado</span>
          <span className="detail-val">{formatCurrency(receipt.netoGravado)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-key">IVA ({receipt.alicuotaIva}%)</span>
          <span className="detail-val">{formatCurrency(receipt.iva)}</span>
        </div>
        {parseFloat(receipt.otrosImpuestos) > 0 && (
          <div className="detail-row">
            <span className="detail-key">Otros impuestos</span>
            <span className="detail-val">{formatCurrency(receipt.otrosImpuestos)}</span>
          </div>
        )}
        <div className="detail-row" style={{ borderTop: '2px solid var(--gray-200)', paddingTop: 10, marginTop: 4 }}>
          <span className="detail-key" style={{ fontWeight: 700, color: 'var(--gray-800)' }}>TOTAL</span>
          <span className="detail-val" style={{ fontSize: '1.1rem', color: 'var(--blue-700)' }}>
            {formatCurrency(receipt.total)}
          </span>
        </div>
      </div>

      {(receipt.cae || receipt.vencimientoCae) && (
        <div className="detail-section">
          <div className="form-section-title" style={{ marginBottom: 10 }}>Autorización AFIP</div>
          {receipt.cae && (
            <div className="detail-row">
              <span className="detail-key">CAE</span>
              <span className="detail-val">{receipt.cae}</span>
            </div>
          )}
          {receipt.vencimientoCae && (
            <div className="detail-row">
              <span className="detail-key">Vto. CAE</span>
              <span className="detail-val">{formatDate(receipt.vencimientoCae)}</span>
            </div>
          )}
        </div>
      )}

      {receipt.observaciones && (
        <div className="detail-section">
          <div className="form-section-title" style={{ marginBottom: 10 }}>Observaciones</div>
          <p style={{ fontSize: '.875rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>
            {receipt.observaciones}
          </p>
        </div>
      )}

      {receipt.foto && (
        <div className="detail-section">
          <div className="form-section-title" style={{ marginBottom: 10 }}>
            <Image size={14} /> Foto del comprobante
          </div>
          {showPhoto ? (
            <>
              <img src={receipt.foto} alt="Comprobante" className="photo-thumb" />
              <button className="btn btn-secondary w-full mt-4" onClick={() => setShowPhoto(false)}>
                Ocultar foto
              </button>
            </>
          ) : (
            <button className="btn btn-secondary w-full" onClick={() => setShowPhoto(true)}>
              <Image size={16} /> Ver foto
            </button>
          )}
        </div>
      )}

      <div style={{ padding: '8px 0 16px' }}>
        <button
          className={`btn w-full ${confirmDelete ? 'btn-danger' : 'btn-secondary'}`}
          onClick={handleDelete}
          style={{ padding: '12px' }}
        >
          <Trash2 size={16} />
          {confirmDelete ? 'Confirmar eliminación' : 'Eliminar comprobante'}
        </button>
        {confirmDelete && (
          <button
            className="btn btn-secondary w-full"
            style={{ marginTop: 8, padding: '12px' }}
            onClick={() => setConfirmDelete(false)}
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
