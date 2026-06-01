import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { saveVencimiento } from '../db/store.js'
import EstadoBadge from './EstadoBadge.jsx'

const ESTADOS = ['pendiente','en_proceso','presentado','pagado','no_aplica']

function urgencyClass(estado, fecha) {
  if (['pagado','presentado','no_aplica'].includes(estado)) return 'urgency-gris'
  const hoy = new Date().toISOString().slice(0,10)
  if (fecha < hoy) return 'urgency-rojo'
  const dias = differenceInDays(parseISO(fecha), new Date())
  if (dias <= 3)  return 'urgency-rojo'
  if (dias <= 7)  return 'urgency-naranja'
  return 'urgency-verde'
}

function diasLabel(estado, fecha) {
  const hoy = new Date().toISOString().slice(0,10)
  if (fecha < hoy && !['pagado','presentado','no_aplica'].includes(estado)) {
    const d = differenceInDays(new Date(), parseISO(fecha))
    return <span className="text-danger font-bold text-xs">Vencido hace {d}d</span>
  }
  const dias = differenceInDays(parseISO(fecha), new Date())
  if (['pagado','presentado','no_aplica'].includes(estado)) return <span className="text-gray-400 text-xs">—</span>
  if (dias === 0) return <span className="text-danger font-bold text-xs">Hoy</span>
  if (dias === 1) return <span className="text-danger font-bold text-xs">Mañana</span>
  return <span className="text-gray-600 text-xs">{dias} días</span>
}

export default function VencimientoRow({ v, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [notas, setNotas] = useState(v.notas || '')

  const cambiarEstado = (estado) => {
    saveVencimiento({ ...v, estado })
    onUpdate?.()
    setOpen(false)
  }

  const guardarNotas = () => {
    saveVencimiento({ ...v, notas })
    onUpdate?.()
  }

  return (
    <div className={`card mb-1.5 overflow-hidden ${urgencyClass(v.estado, v.fecha)}`}>
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
        onClick={() => setOpen(o => !o)}
      >
        {/* Fecha */}
        <div className="w-16 shrink-0 text-center">
          <p className="text-sm font-bold text-gray-800">
            {format(parseISO(v.fecha), 'dd/MM', { locale: es })}
          </p>
          {diasLabel(v.estado, v.fecha)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{v.tipo?.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{v.cliente?.nombre} · {v.periodo}</p>
        </div>

        {/* Estado + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <EstadoBadge estado={v.estado} />
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180':''}`} />
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50 space-y-3">
          {/* Cambio rápido de estado */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Cambiar estado:</p>
            <div className="flex flex-wrap gap-1.5">
              {ESTADOS.map(e => (
                <button
                  key={e}
                  onClick={() => cambiarEstado(e)}
                  className={`badge cursor-pointer hover:opacity-80 ${v.estado === e ? 'ring-1 ring-offset-1 ring-gray-400' : ''} badge-${e}`}
                >
                  {e === 'pendiente' ? 'Pendiente' :
                   e === 'en_proceso' ? 'En proceso' :
                   e === 'presentado' ? 'Presentado' :
                   e === 'pagado' ? 'Pagado' : 'No aplica'}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Notas:</p>
            <div className="flex gap-2">
              <input
                className="form-input text-xs py-1.5 flex-1"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Agregar notas..."
                onKeyDown={e => e.key === 'Enter' && guardarNotas()}
              />
              <button className="btn btn-primary btn-sm" onClick={guardarNotas}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
