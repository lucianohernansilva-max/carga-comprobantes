import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         getDay, isSameMonth, isToday, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// Color de punto según urgencia/estado
const dotColor = (estado, fecha) => {
  if (['pagado','presentado','no_aplica'].includes(estado)) return 'bg-gray-300'
  const hoy = new Date().toISOString().slice(0,10)
  if (fecha < hoy || estado === 'vencido') return 'bg-danger'
  return 'bg-primary'
}

function VencimientoPopup({ vencimientos, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-800 text-sm">
            {vencimientos[0] && format(parseISO(vencimientos[0].fecha), "d 'de' MMMM", { locale: es })}
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {vencimientos.map(v => (
            <div key={v.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50">
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor(v.estado, v.fecha)}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.tipo?.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{v.cliente?.nombre}</p>
                <span className={`badge badge-${v.estado} text-xs mt-0.5`}>{v.estado}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Calendario() {
  const { vencimientos, clientes } = useApp()
  const now = new Date()
  const [mes, setMes]     = useState(now.getMonth())
  const [anio, setAnio]   = useState(now.getFullYear())
  const [popup, setPopup] = useState(null) // array de vencimientos del día clickeado
  const [filtroCliente, setFC] = useState('')

  const navMes = (d) => {
    let m = mes + d, a = anio
    if (m < 0)  { m = 11; a-- }
    if (m > 11) { m = 0;  a++ }
    setMes(m); setAnio(a)
  }

  const primerDia = startOfMonth(new Date(anio, mes))
  const ultimoDia = endOfMonth(primerDia)
  const dias      = eachDayOfInterval({ start: primerDia, end: ultimoDia })

  // Padding inicial (días del mes anterior visibles)
  const padInicio = getDay(primerDia)   // 0=domingo

  // Mapa fecha → vencimientos
  const vencPorFecha = useMemo(() => {
    const map = {}
    for (const v of vencimientos) {
      if (!v.fecha) continue
      if (filtroCliente && v.clienteId !== filtroCliente) continue
      if (!map[v.fecha]) map[v.fecha] = []
      map[v.fecha].push(v)
    }
    return map
  }, [vencimientos, filtroCliente])

  const MESES_LABEL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="p-5 max-w-4xl">
      {popup && <VencimientoPopup vencimientos={popup} onClose={() => setPopup(null)} />}

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
        <select className="form-select text-xs py-1.5 w-auto" value={filtroCliente} onChange={e => setFC(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {/* Nav mes */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navMes(-1)} className="btn btn-secondary btn-sm">
          <ChevronLeft size={15} />
        </button>
        <h2 className="text-lg font-bold text-gray-800 min-w-[200px] text-center">
          {MESES_LABEL[mes]} {anio}
        </h2>
        <button onClick={() => navMes(1)} className="btn btn-secondary btn-sm">
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Grilla */}
      <div className="card overflow-hidden">
        {/* Encabezado días de semana */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7">
          {/* Padding inicio */}
          {Array.from({ length: padInicio }).map((_, i) => (
            <div key={`pad-${i}`} className="border-b border-r border-gray-100 h-24 bg-gray-50/50" />
          ))}

          {dias.map((dia) => {
            const fechaStr = format(dia, 'yyyy-MM-dd')
            const vencs    = vencPorFecha[fechaStr] || []
            const esHoy    = isToday(dia)
            const maxDots  = 3

            return (
              <div
                key={fechaStr}
                onClick={() => vencs.length > 0 && setPopup(vencs)}
                className={`border-b border-r border-gray-100 h-24 p-1.5 flex flex-col transition-colors
                  ${vencs.length > 0 ? 'cursor-pointer hover:bg-blue-50' : ''}
                  ${esHoy ? 'bg-primary/5' : ''}
                `}
              >
                {/* Número del día */}
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1
                  ${esHoy ? 'bg-primary text-white' : 'text-gray-700'}`}>
                  {format(dia, 'd')}
                </div>

                {/* Puntos/pills de vencimientos */}
                <div className="flex-1 overflow-hidden space-y-0.5">
                  {vencs.slice(0, maxDots).map((v, i) => (
                    <div key={v.id} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor(v.estado, v.fecha)}`} />
                      <span className="text-xs text-gray-600 truncate leading-tight" style={{ fontSize: '10px' }}>
                        {v.tipo?.nombre}
                      </span>
                    </div>
                  ))}
                  {vencs.length > maxDots && (
                    <p className="text-xs text-gray-400" style={{ fontSize: '10px' }}>
                      +{vencs.length - maxDots} más
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-danger rounded-full" />Vencido / urgente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-primary rounded-full" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 bg-gray-300 rounded-full" />Completado</span>
        <span className="ml-auto italic">Clic en un día para ver el detalle</span>
      </div>
    </div>
  )
}
