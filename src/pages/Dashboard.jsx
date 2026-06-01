import { useState, useMemo } from 'react'
import { differenceInDays, parseISO, format, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import VencimientoRow from '../components/VencimientoRow.jsx'

const HORIZONTES = [
  { label: '30 días', days: 30 },
  { label: '60 días', days: 60 },
  { label: '90 días', days: 90 },
]

export default function Dashboard() {
  const { vencimientos, clientes, refresh } = useApp()
  const [horizonte, setHorizonte]   = useState(30)
  const [filtroCliente, setFiltro]  = useState('')
  const [filtroEstado, setFiltroE]  = useState('')

  const hoy   = new Date().toISOString().slice(0, 10)
  const hasta = addDays(new Date(), horizonte).toISOString().slice(0, 10)

  // Vencidos sin completar
  const vencidos = vencimientos.filter(v =>
    v.fecha < hoy && !['pagado','presentado','no_aplica'].includes(v.estado)
  )

  // Próximos en el horizonte
  const proximos = useMemo(() => {
    return vencimientos
      .filter(v => v.fecha >= hoy && v.fecha <= hasta)
      .filter(v => !filtroCliente || v.clienteId === filtroCliente)
      .filter(v => !filtroEstado  || v.estado === filtroEstado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vencimientos, hoy, hasta, filtroCliente, filtroEstado])

  const urgentes7 = vencimientos.filter(v => {
    if (!['pendiente','en_proceso'].includes(v.estado)) return false
    const d = differenceInDays(parseISO(v.fecha), new Date())
    return d >= 0 && d <= 7
  }).length

  const pendientes  = vencimientos.filter(v => v.estado === 'pendiente').length
  const completados = vencimientos.filter(v => ['pagado','presentado'].includes(v.estado)).length

  return (
    <div className="p-5 max-w-4xl">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Alert banner si hay vencidos */}
      {vencidos.length > 0 && (
        <div className="mb-4 bg-red-50 border border-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-danger shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-bold text-danger">
              {vencidos.length} obligación{vencidos.length > 1 ? 'es' : ''} vencida{vencidos.length > 1 ? 's' : ''} sin completar
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {vencidos.map(v => `${v.tipo?.nombre} – ${v.cliente?.nombre}`).slice(0,3).join(' · ')}
              {vencidos.length > 3 ? ` y ${vencidos.length - 3} más` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-danger">{urgentes7}</p>
          <p className="text-xs text-gray-500 mt-0.5">Próx. 7 días</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-warning">{pendientes}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success">{completados}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completados</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Horizonte */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {HORIZONTES.map(h => (
            <button
              key={h.days}
              onClick={() => setHorizonte(h.days)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                horizonte === h.days
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Filtro cliente */}
        <select
          className="form-select text-xs py-1.5 w-auto"
          value={filtroCliente}
          onChange={e => setFiltro(e.target.value)}
        >
          <option value="">Todos los clientes</option>
          {clientes.map(c => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        {/* Filtro estado */}
        <select
          className="form-select text-xs py-1.5 w-auto"
          value={filtroEstado}
          onChange={e => setFiltroE(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="presentado">Presentado</option>
          <option value="pagado">Pagado</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>

      {/* Lista */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Próximos {horizonte} días — {proximos.length} vencimiento{proximos.length !== 1 ? 's' : ''}
        </p>

        {proximos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <CheckCircle size={40} className="mx-auto mb-3 text-success opacity-50" />
            <p className="font-semibold text-gray-500">No hay vencimientos en este período</p>
          </div>
        ) : (
          proximos.map(v => (
            <VencimientoRow key={v.id} v={v} onUpdate={refresh} />
          ))
        )}
      </div>
    </div>
  )
}
