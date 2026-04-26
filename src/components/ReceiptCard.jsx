import { Link } from 'react-router-dom'
import { getTipoInfo, getBadgeClass, formatCurrency, formatDate, formatComprobanteNum } from '../utils/formatters'

export default function ReceiptCard({ receipt }) {
  const tipo = getTipoInfo(receipt.tipo)
  const badgeClass = getBadgeClass(tipo.type)

  return (
    <Link to={`/comprobante/${receipt.id}`} className="receipt-card">
      <div className={`receipt-type-badge ${badgeClass}`}>
        {tipo.badge}
      </div>
      <div className="receipt-info">
        <div className="receipt-razon">{receipt.razonSocial || 'Sin razón social'}</div>
        <div className="receipt-meta">
          {formatComprobanteNum(receipt.puntoVenta, receipt.numeroComprobante)} · {formatDate(receipt.fecha)}
        </div>
      </div>
      <div className="receipt-amount">
        {formatCurrency(receipt.total)}
      </div>
    </Link>
  )
}
