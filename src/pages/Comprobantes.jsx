import { useState, useMemo } from 'react'
import { Upload, Download, FileText, Trash2, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import {
  getComprobantes, deleteComprobantes, deleteComprobantesGrupo,
  exportarExcel, exportarResumenIVA,
  ORIGENES, ORIGENES_LABELS,
} from '../db/comprobantes.js'
import ImportadorComprobantes from '../components/ImportadorComprobantes.jsx'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const fmt = (n) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(n || 0)
const now = new Date()

const COLS_MIS = ['Fecha','Tipo Comp.','PV-Número','CUIT','Denominación','Neto','IVA','Total']
const COLS_IVA = ['Período','CUIT','Denominación','Tipo','Número','Base','Alíc.%','IVA']
const COLS_CDP = ['N° CDP','Fecha','Destinatario','Especie','Cantidad','Origen','Destino','Estado']

function ComprobanteFila({ c, onDelete }) {
  const [open, setOpen] = useState(false)

  const cols = () => {
    if (c.origen === ORIGENES.PORTAL_IVA) return [
      c.periodo, c.cuitContraparte, c.denominacion, c.tipoComprobante, c.numero,
      fmt(c.baseImponible), c.alicuota ? `${c.alicuota}%` : '', fmt(c.iva),
    ]
    if (c.origen === ORIGENES.CARTA_PORTE) return [
      c.numeroCDP, c.fecha, c.denominacion, c.producto,
      c.cantidad ? `${fmt(c.cantidad)} ${c.unidad||''}` : '', c.origenLP, c.destinoLP, c.estado,
    ]
    return [
      c.fecha,
      c.tipoComprobante,
      c.puntoVenta && c.numero ? `${c.puntoVenta}-${c.numero}` : c.numero,
      c.cuitContraparte, c.denominacion,
      fmt(c.netoGravado), fmt(c.iva), fmt(c.importeTotal),
    ]
  }

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer border-t border-gray-100 text-xs" onClick={() => setOpen(o => !o)}>
        {cols().map((v, i) => (
          <td key={i} className="px-2 py-1.5 text-gray-700 max-w-[130px] truncate">{v || '—'}</td>
        ))}
        <td className="px-2 py-1.5 text-right">
          <ChevronDown size={12} className={`text-gray-400 transition-transform inline ${open ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50">
          <td colSpan={9} className="px-3 py-2">
            <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
              <span>Origen: <b className="text-gray-700">{ORIGENES_LABELS[c.origen]}</b></span>
              <span>Tipo: <b className="text-gray-700">{c.tipo === 'emitido' ? 'Emitido' : 'Recibido'}</b></span>
              {c.importedAt && <span>Importado: {c.importedAt.slice(0,10)}</span>}
              <button onClick={() => onDelete(c.id)} className="ml-auto text-danger hover:text-red-700 flex items-center gap-1">
                <Trash2 size={11} /> Eliminar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Comprobantes() {
  const { clientes, refresh } = useApp()
  const [showImport, setShowImport] = useState(false)
  const [tick, setTick]             = useState(0)  // force re-read after import

  // Filtros
  const [fCliente, setFCliente] = useState('')
  const [fOrigen,  setFOrigen]  = useState('')
  const [fTipo,    setFTipo]    = useState('')
  const [fMes,     setFMes]     = useState(now.getMonth())       // 0-based
  const [fAnio,    setFAnio]    = useState(now.getFullYear())

  const periodo = `${fAnio}-${String(fMes + 1).padStart(2,'0')}`

  const todos = useMemo(() => getComprobantes(), [tick, showImport])

  const filtered = useMemo(() => {
    return todos
      .filter(c => !fCliente || c.clienteId === fCliente)
      .filter(c => !fOrigen  || c.origen    === fOrigen)
      .filter(c => !fTipo    || c.tipo      === fTipo)
      .filter(c => c.periodo === periodo)
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  }, [todos, fCliente, fOrigen, fTipo, periodo])

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.nombre])), [clientes])

  // Totales del período visible
  const totales = useMemo(() => {
    const emitidos  = filtered.filter(c => c.tipo === 'emitido')
    const recibidos = filtered.filter(c => c.tipo === 'recibido')
    const sum = (arr, k) => arr.reduce((a, c) => a + (c[k] || 0), 0)
    return {
      totalEmitido:  sum(emitidos,  'importeTotal'),
      ivaDebito:     sum(emitidos,  'iva'),
      netoEmitido:   sum(emitidos,  'netoGravado'),
      totalRecibido: sum(recibidos, 'importeTotal'),
      ivaCredito:    sum(recibidos, 'iva'),
      netoRecibido:  sum(recibidos, 'netoGravado'),
    }
  }, [filtered])

  const saldoIVA = totales.ivaDebito - totales.ivaCredito

  // Indicador de períodos importados (todas las combinaciones cliente+origen)
  const periodosImportados = useMemo(() => {
    const set = new Set(todos.map(c => `${c.clienteId}__${c.origen}__${c.tipo}__${c.periodo}`))
    return set
  }, [todos])

  const navMes = (delta) => {
    let m = fMes + delta, a = fAnio
    if (m < 0)  { m = 11; a-- }
    if (m > 11) { m = 0;  a++ }
    setFMes(m); setFAnio(a)
  }

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar este comprobante?')) return
    deleteComprobantes([id])
    setTick(t => t + 1)
  }

  const handleDeleteGrupo = () => {
    if (!fCliente) { alert('Seleccioná un cliente para eliminar el grupo.'); return }
    if (!confirm(`¿Eliminar todos los comprobantes de ${clienteMap[fCliente]} para el período ${periodo}?`)) return
    deleteComprobantesGrupo(fCliente, fOrigen || undefined, fTipo || undefined, periodo)
    setTick(t => t + 1)
  }

  // Headers de tabla según origen seleccionado
  const tableHeaders = fOrigen === ORIGENES.PORTAL_IVA ? COLS_IVA :
                       fOrigen === ORIGENES.CARTA_PORTE ? COLS_CDP : COLS_MIS

  return (
    <div className="p-5 max-w-5xl">
      {showImport && (
        <ImportadorComprobantes
          clientes={clientes}
          onDone={() => { setTick(t => t + 1); refresh() }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Comprobantes</h1>
        <div className="flex gap-2">
          <button onClick={() => exportarResumenIVA(filtered, clienteMap)} className="btn btn-outline btn-sm">
            <FileText size={13} /> Resumen IVA
          </button>
          <button onClick={() => exportarExcel(filtered, clienteMap)} className="btn btn-outline btn-sm">
            <Download size={13} /> Excel
          </button>
          <button onClick={() => setShowImport(true)} className="btn btn-primary btn-sm">
            <Upload size={13} /> Importar
          </button>
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navMes(-1)} className="btn btn-secondary btn-sm px-2">‹</button>
        <span className="text-base font-semibold text-gray-800 min-w-[140px] text-center">
          {MESES[fMes]} {fAnio}
        </span>
        <button onClick={() => navMes(1)} className="btn btn-secondary btn-sm px-2">›</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="form-select text-xs py-1.5 w-auto" value={fCliente} onChange={e => setFCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="form-select text-xs py-1.5 w-auto" value={fOrigen} onChange={e => setFOrigen(e.target.value)}>
          <option value="">Todos los orígenes</option>
          {Object.entries(ORIGENES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="form-select text-xs py-1.5 w-auto" value={fTipo} onChange={e => setFTipo(e.target.value)}>
          <option value="">Emitidos y recibidos</option>
          <option value="emitido">Emitidos</option>
          <option value="recibido">Recibidos</option>
        </select>
        {filtered.length > 0 && (
          <button onClick={handleDeleteGrupo} className="btn btn-danger btn-sm ml-auto">
            <Trash2 size={12} /> Eliminar período
          </button>
        )}
      </div>

      {/* Indicador de importación por origen */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(ORIGENES_LABELS).map(([key, label]) => {
          const tiposCheck = key === ORIGENES.CARTA_PORTE ? ['emitido'] : ['emitido','recibido']
          const importados = tiposCheck.filter(t => {
            const k = `${fCliente}__${key}__${t}__${periodo}`
            return fCliente ? periodosImportados.has(k) : todos.some(c => c.origen === key && c.tipo === t && c.periodo === periodo)
          })
          const bg = importados.length > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'
          return (
            <span key={key} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${bg}`}>
              {importados.length > 0 ? '✓' : '·'} {label}
            </span>
          )
        })}
      </div>

      {/* Totales */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="card-padded py-3">
            <p className="text-xs text-gray-500 mb-0.5">Total Facturado</p>
            <p className="text-base font-bold text-gray-900">${fmt(totales.totalEmitido)}</p>
            <p className="text-xs text-gray-400">IVA débito: ${fmt(totales.ivaDebito)}</p>
          </div>
          <div className="card-padded py-3">
            <p className="text-xs text-gray-500 mb-0.5">Total Compras</p>
            <p className="text-base font-bold text-gray-900">${fmt(totales.totalRecibido)}</p>
            <p className="text-xs text-gray-400">IVA crédito: ${fmt(totales.ivaCredito)}</p>
          </div>
          <div className="card-padded py-3">
            <p className="text-xs text-gray-500 mb-0.5">Saldo IVA</p>
            <p className={`text-base font-bold ${saldoIVA >= 0 ? 'text-danger' : 'text-success'}`}>
              ${fmt(Math.abs(saldoIVA))}
            </p>
            <p className="text-xs text-gray-400">{saldoIVA >= 0 ? 'A pagar' : 'A favor'}</p>
          </div>
        </div>
      )}

      {/* Tabla */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {filtered.length} comprobante{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <Upload size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay comprobantes para este período</p>
          <button onClick={() => setShowImport(true)} className="btn btn-primary btn-sm mt-3">
            <Upload size={13} /> Importar ahora
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="text-xs w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {tableHeaders.map(h => <th key={h} className="px-2 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>)}
                <th className="px-2 py-2 w-6" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <ComprobanteFila key={c.id} c={c} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
