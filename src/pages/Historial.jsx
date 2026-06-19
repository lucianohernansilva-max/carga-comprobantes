import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, History } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useApp } from '../context/AppContext.jsx'
import EstadoBadge from '../components/EstadoBadge.jsx'

const ESTADOS_FINALES = ['pagado','presentado','no_aplica','vencido']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function Historial() {
  const { vencimientos, clientes, tipos } = useApp()
  const now = new Date()
  const [anio, setAnio]          = useState(now.getFullYear())
  const [filtroCliente, setFC]   = useState('')
  const [filtroTipo, setFT]      = useState('')
  const [filtroEstado, setFE]    = useState('')

  const historial = useMemo(() => {
    return vencimientos
      .filter(v => ESTADOS_FINALES.includes(v.estado))
      .filter(v => v.fecha?.startsWith(String(anio)))
      .filter(v => !filtroCliente || v.clienteId === filtroCliente)
      .filter(v => !filtroTipo   || v.tipoObligacionId === filtroTipo)
      .filter(v => !filtroEstado || v.estado === filtroEstado)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [vencimientos, anio, filtroCliente, filtroTipo, filtroEstado])

  const exportar = () => {
    const rows = historial.map(v => ({
      'Fecha':    v.fecha,
      'Tipo':     v.tipo?.nombre || '',
      'Cliente':  v.cliente?.nombre || '',
      'CUIT':     v.cliente?.cuit || '',
      'Período':  v.periodo,
      'Estado':   v.estado,
      'Notas':    v.notas || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Historial')
    XLSX.writeFile(wb, `Historial_${anio}.xlsx`)
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Historial</h1>
          <p className="text-sm text-gray-500">Registro de vencimientos completados</p>
        </div>
        <button onClick={exportar} className="btn btn-outline btn-sm">
          <Download size={13} /> Exportar
        </button>
      </div>

      {/* Año */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setAnio(a => a - 1)} className="btn btn-secondary btn-sm px-2">‹</button>
        <span className="text-base font-semibold text-gray-800 min-w-[60px] text-center">{anio}</span>
        <button onClick={() => setAnio(a => a + 1)} className="btn btn-secondary btn-sm px-2">›</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="form-select text-xs py-1.5 w-auto" value={filtroCliente} onChange={e => setFC(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="form-select text-xs py-1.5 w-auto" value={filtroTipo} onChange={e => setFT(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select className="form-select text-xs py-1.5 w-auto" value={filtroEstado} onChange={e => setFE(e.target.value)}>
          <option value="">Todos</option>
          {ESTADOS_FINALES.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {historial.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sin historial para {anio}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Fecha</th>
                <th className="px-3 py-2 text-left">Obligación</th>
                <th className="px-3 py-2 text-left">Cliente</th>
                <th className="px-3 py-2 text-left">Período</th>
                <th className="px-3 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((v, i) => (
                <tr key={v.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {format(parseISO(v.fecha), 'dd/MM/yy')}
                  </td>
                  <td className="px-3 py-2 text-gray-800 font-medium">{v.tipo?.nombre}</td>
                  <td className="px-3 py-2 text-gray-700">{v.cliente?.nombre}</td>
                  <td className="px-3 py-2 text-gray-600">{v.periodo}</td>
                  <td className="px-3 py-2"><EstadoBadge estado={v.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
