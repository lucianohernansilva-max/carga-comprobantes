import { useState, useMemo } from 'react'
import { format, parseISO, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useApp } from '../context/AppContext.jsx'
import VencimientoRow from '../components/VencimientoRow.jsx'
import { generarReporteMensual } from '../db/reportePDF.js'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const ESTADOS_OPTS = ['','pendiente','en_proceso','presentado','pagado','no_aplica','vencido']
const ESTADO_LABELS = { '':'Todos', pendiente:'Pendiente', en_proceso:'En proceso', presentado:'Presentado', pagado:'Pagado', no_aplica:'No aplica', vencido:'Vencido' }

const ESTADO_COLORS_XLSX = {
  pendiente:   'FFFFCC00',
  en_proceso:  'FF3B82F6',
  presentado:  'FFA855F7',
  pagado:      'FF27AE60',
  no_aplica:   'FF9CA3AF',
  vencido:     'FFC0392B',
}

export default function Vencimientos() {
  const { vencimientos, clientes, tipos, config, refresh } = useApp()
  const now     = new Date()
  const [mes, setMes]           = useState(now.getMonth())   // 0-based
  const [anio, setAnio]         = useState(now.getFullYear())
  const [filtroCliente, setFC]  = useState('')
  const [filtroTipo, setFT]     = useState('')
  const [filtroEstado, setFE]   = useState('')

  const filtered = useMemo(() => {
    const mesStr = `${anio}-${String(mes + 1).padStart(2, '0')}`
    return vencimientos
      .filter(v => v.periodo?.startsWith(mesStr) || v.fecha?.startsWith(mesStr.slice(0,7)))
      .filter(v => !filtroCliente || v.clienteId === filtroCliente)
      .filter(v => !filtroTipo   || v.tipoObligacionId === filtroTipo)
      .filter(v => !filtroEstado || v.estado === filtroEstado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vencimientos, mes, anio, filtroCliente, filtroTipo, filtroEstado])

  const exportar = () => {
    const rows = filtered.map(v => ({
      'Fecha':        v.fecha,
      'Tipo':         v.tipo?.nombre || '',
      'Cliente':      v.cliente?.nombre || '',
      'CUIT':         v.cliente?.cuit || '',
      'Período':      v.periodo,
      'Estado':       ESTADO_LABELS[v.estado] || v.estado,
      'Notas':        v.notas || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [12,30,30,18,10,14,30].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Vencimientos')
    XLSX.writeFile(wb, `Vencimientos_${MESES[mes]}_${anio}.xlsx`)
  }

  const exportarPDF = () => {
    generarReporteMensual({ vencimientos: filtered, mes, anio, config })
  }

  const navMes = (delta) => {
    let m = mes + delta, a = anio
    if (m < 0)  { m = 11; a-- }
    if (m > 11) { m = 0;  a++ }
    setMes(m); setAnio(a)
  }

  return (
    <div className="p-5 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Vencimientos</h1>
        <div className="flex gap-2">
          <button onClick={exportarPDF} className="btn btn-outline btn-sm">
            <FileText size={13} /> PDF
          </button>
          <button onClick={exportar} className="btn btn-outline btn-sm">
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navMes(-1)} className="btn btn-secondary btn-sm px-2">‹</button>
        <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
          {MESES[mes]} {anio}
        </span>
        <button onClick={() => navMes(1)} className="btn btn-secondary btn-sm px-2">›</button>
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
          {ESTADOS_OPTS.map(e => <option key={e} value={e}>{ESTADO_LABELS[e]}</option>)}
        </select>
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {filtered.length} vencimiento{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No hay vencimientos para este período</p>
        </div>
      ) : (
        filtered.map(v => <VencimientoRow key={v.id} v={v} onUpdate={refresh} />)
      )}
    </div>
  )
}
