export default function ReceiptItem({ receipt, onDelete }) {
  const importe = receipt.importe_total != null
    ? Number(receipt.importe_total).toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
      })
    : '—'

  const badgeColors = {
    A: 'bg-purple-100 text-purple-700',
    B: 'bg-blue-100 text-blue-700',
    C: 'bg-gray-100 text-gray-600',
  }
  const badgeClass = badgeColors[receipt.tipo_comprobante] ?? 'bg-gray-100 text-gray-600'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3">
      {receipt.thumbnail && (
        <img
          src={receipt.thumbnail}
          alt="Comprobante"
          className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-gray-200"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {receipt.tipo_comprobante && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${badgeClass}`}>
              {receipt.tipo_comprobante}
            </span>
          )}
          <span className="text-xs text-gray-400 truncate">{receipt.numero_comprobante ?? '—'}</span>
        </div>
        <p className="font-semibold text-gray-800 truncate text-sm leading-snug">
          {receipt.razon_social ?? <span className="text-gray-400 italic">Sin razón social</span>}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{receipt.fecha ?? '—'}</p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className="text-green-600 font-bold text-sm">{importe}</span>
        <button
          onClick={() => onDelete(receipt.id)}
          className="text-gray-300 hover:text-red-400 transition-colors p-1 -mr-1"
          aria-label="Eliminar comprobante"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
