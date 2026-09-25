import ReceiptItem from './ReceiptItem'

export default function ReceiptList({ receipts, onDelete, onAdd }) {
  if (receipts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
          <ReceiptEmptyIcon />
        </div>
        <div>
          <h2 className="text-gray-700 font-semibold text-lg">Sin comprobantes</h2>
          <p className="text-gray-400 text-sm mt-1">
            Tocá el botón <strong>+</strong> para fotografiar tu primer comprobante
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-24">
      {receipts.map((r) => (
        <ReceiptItem key={r.id} receipt={r} onDelete={onDelete} />
      ))}
    </div>
  )
}

function ReceiptEmptyIcon() {
  return (
    <svg className="w-10 h-10 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
