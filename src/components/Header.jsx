export default function Header({ count, total, onExport }) {
  const formattedTotal = total.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  })

  return (
    <header className="bg-brand-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-md">
      <div>
        <h1 className="text-lg font-bold leading-tight">Carga Comprobantes</h1>
        <p className="text-xs text-blue-200">
          {count} {count === 1 ? 'comprobante' : 'comprobantes'} · {formattedTotal}
        </p>
      </div>
      <button
        onClick={onExport}
        disabled={count === 0}
        className="flex items-center gap-1.5 bg-white text-brand-700 text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        <ExportIcon />
        Exportar
      </button>
    </header>
  )
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  )
}
