import { useState, useMemo } from 'react'
import { Search, FileText } from 'lucide-react'
import { useReceipts } from '../hooks/useReceipts'
import ReceiptCard from '../components/ReceiptCard'
import { TIPOS_COMPROBANTE } from '../utils/formatters'

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'FACTURA_A', label: 'Fac. A' },
  { value: 'FACTURA_B', label: 'Fac. B' },
  { value: 'FACTURA_C', label: 'Fac. C' },
  { value: 'NC', label: 'N. Crédito' },
  { value: 'ND', label: 'N. Débito' },
  { value: 'TICKET', label: 'Ticket' },
]

export default function History() {
  const { receipts } = useReceipts()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    return receipts.filter(r => {
      const matchesFilter =
        filter === 'all' ||
        r.tipo === filter ||
        (filter === 'NC' && r.tipo.startsWith('NC_')) ||
        (filter === 'ND' && r.tipo.startsWith('ND_')) ||
        (filter === 'TICKET' && r.tipo.startsWith('TICKET'))

      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        r.razonSocial?.toLowerCase().includes(q) ||
        r.cuitEmisor?.includes(q) ||
        r.numeroComprobante?.toString().includes(q)

      return matchesFilter && matchesSearch
    })
  }, [receipts, filter, search])

  return (
    <div className="page">
      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="search"
          placeholder="Buscar por razón social, CUIT..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="history-filters">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`filter-chip ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="section-title" style={{ marginBottom: 8 }}>
            {filtered.length} comprobante{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="receipt-list">
            {filtered.map(r => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <FileText size={28} />
          </div>
          <h3>{receipts.length === 0 ? 'Sin comprobantes' : 'Sin resultados'}</h3>
          <p>
            {receipts.length === 0
              ? 'Capturá tu primer comprobante fiscal'
              : 'Probá con otros términos de búsqueda'}
          </p>
        </div>
      )}
    </div>
  )
}
