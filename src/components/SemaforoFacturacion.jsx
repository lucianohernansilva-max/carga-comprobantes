import { useState, useMemo } from 'react'
import { getFacturacionMono, saveFacturacionMes, LIMITES_MONOTRIBUTO_DEFAULT } from '../db/store.js'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function semaforo(pct) {
  if (pct >= 95) return { color: 'red',    label: 'RIESGO — Cambio de categoría inminente' }
  if (pct >= 80) return { color: 'orange', label: 'ATENCIÓN — Cerca del límite' }
  return           { color: 'green',   label: 'Normal' }
}

const SC = {
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    bar: 'bg-red-500',    dot: 'bg-red-500'    },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-400', dot: 'bg-orange-400' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  bar: 'bg-green-500',  dot: 'bg-green-500'  },
}

export default function SemaforoFacturacion({ cliente }) {
  const anio     = new Date().getFullYear()
  const mesActual = new Date().getMonth()   // 0-indexed
  const [facturacion, setFact] = useState(() => getFacturacionMono(cliente.id))
  const [editando,    setEdit] = useState(null)
  const [valorEdit,   setVal]  = useState('')

  const limite = LIMITES_MONOTRIBUTO_DEFAULT[cliente.categoriaMonotributo] || null

  const acumulado = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const k = `${anio}-${String(i + 1).padStart(2, '0')}`
      return facturacion[k] || 0
    }).reduce((a, b) => a + b, 0)
  , [facturacion, anio])

  const pct = limite ? (acumulado / limite) * 100 : 0
  const sem = semaforo(pct)
  const sc  = SC[sem.color]

  const guardarMes = (i) => {
    const k = `${anio}-${String(i + 1).padStart(2, '0')}`
    saveFacturacionMes(cliente.id, k, valorEdit)
    setFact(getFacturacionMono(cliente.id))
    setEdit(null); setVal('')
  }

  return (
    <div className="card-padded space-y-3">
      <p className="text-xs font-bold text-primary uppercase tracking-wide">
        Semáforo de facturación — {anio}
      </p>

      {/* Indicador principal */}
      <div className={`rounded-lg px-4 py-3 border ${sc.bg} ${sc.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full shrink-0 ${sc.dot}`} />
          <div className="flex-1">
            <p className={`text-sm font-bold ${sc.text}`}>{sem.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Acumulado: <strong>${acumulado.toLocaleString('es-AR')}</strong>
              {limite && <> / Cat. {cliente.categoriaMonotributo}: ${limite.toLocaleString('es-AR')}</>}
            </p>
          </div>
          {limite && <p className={`text-xl font-black shrink-0 ${sc.text}`}>{Math.round(pct)}%</p>}
        </div>
        {limite && (
          <>
            <div className="mt-2 h-2 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${sc.bar}`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              Disponible: <strong>${Math.max(0, limite - acumulado).toLocaleString('es-AR')}</strong>
            </p>
          </>
        )}
        {!limite && (
          <p className="text-xs text-gray-400 mt-1">
            Asigná una categoría de Monotributo al cliente para ver el límite
          </p>
        )}
      </div>

      {/* Grilla mensual — clic para editar */}
      <div className="grid grid-cols-4 gap-1.5">
        {MESES_CORTOS.map((mes, i) => {
          const k   = `${anio}-${String(i + 1).padStart(2, '0')}`
          const val = facturacion[k]
          const fut = i > mesActual

          return (
            <div key={i}
              onClick={() => { if (!fut) { setEdit(i); setVal(val != null ? String(val) : '') } }}
              className={`rounded-lg border p-2 text-center transition-colors
                ${fut ? 'opacity-30 cursor-default' : 'cursor-pointer hover:border-primary/50'}
                ${editando === i ? 'border-primary ring-1 ring-primary/30' : 'border-gray-200'}`}
            >
              <p className="text-xs font-semibold text-gray-500">{mes}</p>
              {editando === i ? (
                <input autoFocus type="number"
                  className="w-full text-xs text-center border-b border-primary outline-none bg-transparent mt-0.5"
                  value={valorEdit}
                  onChange={e => setVal(e.target.value)}
                  onBlur={() => guardarMes(i)}
                  onKeyDown={e => e.key === 'Enter' && guardarMes(i)}
                />
              ) : (
                <p className={`text-xs font-bold mt-0.5 ${val != null ? 'text-primary' : 'text-gray-200'}`}>
                  {val != null ? `$${(val / 1000).toFixed(0)}k` : '—'}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 text-center">
        Hacé clic en un mes para ingresar la facturación real
      </p>
    </div>
  )
}
