import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Upload, Users, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import ImportarClientesModal from '../components/ImportarClientesModal.jsx'

// ─── Grupos de condición fiscal ───────────────────────────────────────────────

const GRUPOS = [
  {
    key: 'monotributista',
    label: 'Monotributistas',
    match: (c) => c.condicionFiscal === 'monotributista',
    color: 'text-green-700 bg-green-50 border-green-200',
    dot: 'bg-green-500',
  },
  {
    key: 'responsable_inscripto',
    label: 'Responsables Inscriptos',
    match: (c) => c.condicionFiscal === 'responsable_inscripto' && c.tipoPersona !== 'juridica',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
  },
  {
    key: 'sociedades',
    label: 'Sociedades (SRL / SA / SAS)',
    match: (c) => c.tipoPersona === 'juridica' || ['srl','sa','sas'].some(t => c.nombre?.toLowerCase().includes(` ${t}`) || c.nombre?.toLowerCase().endsWith(` ${t}.`)),
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  {
    key: 'autonomo',
    label: 'Autónomos',
    match: (c) => c.condicionFiscal === 'autonomo',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    dot: 'bg-purple-500',
  },
  {
    key: 'otros',
    label: 'Otros',
    match: () => true,   // catch-all
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    dot: 'bg-gray-400',
  },
]

const CHIPS = [
  { key: '', label: 'Todos' },
  { key: 'monotributista',       label: 'Monotributistas' },
  { key: 'responsable_inscripto',label: 'RI' },
  { key: 'sociedades',           label: 'Sociedades' },
  { key: 'autonomo',             label: 'Autónomos' },
]

// ─── Fila de cliente ──────────────────────────────────────────────────────────

function ClienteFila({ c, pendientes, vencidos }) {
  return (
    <Link
      to={`/clientes/${c.id}`}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-100 first:border-t-0"
    >
      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{c.nombre.charAt(0).toUpperCase()}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
          {!c.activo && <span className="badge badge-no_aplica text-xs">Inactivo</span>}
        </div>
        <p className="text-xs text-gray-400">CUIT {c.cuit || '—'}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {vencidos > 0 && (
          <span className="badge bg-red-100 text-danger text-xs">
            {vencidos} venc.
          </span>
        )}
        {vencidos === 0 && pendientes > 0 && (
          <span className="badge bg-yellow-100 text-yellow-700 text-xs">
            {pendientes} pend.
          </span>
        )}
        {pendientes === 0 && vencidos === 0 && (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>
    </Link>
  )
}

// ─── Grupo colapsable ─────────────────────────────────────────────────────────

function GrupoClientes({ grupo, clientes, pendientesPorCliente, vencidosPorCliente }) {
  const [abierto, setAbierto] = useState(false)

  if (!clientes.length) return null

  return (
    <div className={`card overflow-hidden border ${grupo.color.split(' ').find(c => c.startsWith('border-'))}`}>
      {/* Header del grupo */}
      <button
        onClick={() => setAbierto(a => !a)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 ${grupo.color} hover:opacity-90 transition-opacity`}
      >
        <span className={`w-2 h-2 rounded-full ${grupo.dot} shrink-0`} />
        <span className="text-xs font-bold uppercase tracking-wide flex-1 text-left">
          {grupo.label}
        </span>
        <span className="text-xs font-semibold opacity-70">({clientes.length})</span>
        <ChevronDown size={14} className={`transition-transform shrink-0 ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {/* Filas de clientes */}
      {abierto && (
        <div className="bg-white">
          {clientes.map(c => (
            <ClienteFila
              key={c.id}
              c={c}
              pendientes={pendientesPorCliente(c.id)}
              vencidos={vencidosPorCliente(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Clientes() {
  const { clientes, vencimientos, refresh } = useApp()
  const [busqueda, setBusqueda]     = useState('')
  const [chipActivo, setChipActivo] = useState('')
  const [modalImportar, setModalImportar] = useState(false)

  const hoy = new Date().toISOString().slice(0, 10)

  const pendientesPorCliente = (id) =>
    vencimientos.filter(v => v.clienteId === id && ['pendiente','en_proceso'].includes(v.estado)).length

  const vencidosPorCliente = (id) =>
    vencimientos.filter(v => v.clienteId === id && v.fecha < hoy && !['pagado','presentado','no_aplica'].includes(v.estado)).length

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return clientes
      .filter(c => !busqueda || c.nombre.toLowerCase().includes(q) || (c.cuit || '').includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [clientes, busqueda])

  // Asignar cada cliente a su primer grupo que coincida
  const clientesPorGrupo = useMemo(() => {
    const asignados = new Set()
    const resultado = {}
    for (const grupo of GRUPOS) {
      resultado[grupo.key] = clientesFiltrados.filter(c => {
        if (asignados.has(c.id)) return false
        // Si hay chip activo, solo mostrar ese grupo
        if (chipActivo && grupo.key !== chipActivo) return false
        if (grupo.match(c)) { asignados.add(c.id); return true }
        return false
      })
    }
    return resultado
  }, [clientesFiltrados, chipActivo])

  const totalFiltrados = clientesFiltrados.length

  return (
    <div className="p-5 max-w-3xl">
      {modalImportar && (
        <ImportarClientesModal
          onClose={() => setModalImportar(false)}
          onImportado={refresh}
        />
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalImportar(true)} className="btn btn-outline btn-sm">
            <Upload size={13} /> Importar Excel
          </button>
          <Link to="/clientes/nuevo" className="btn btn-primary btn-sm">
            <Plus size={14} /> Nuevo
          </Link>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="form-input pl-9"
          placeholder="Buscar por nombre o CUIT..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Chips de filtro rápido */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => setChipActivo(chip.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              chipActivo === chip.key
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Sin resultados */}
      {totalFiltrados === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-gray-500">
            {busqueda ? 'No se encontraron clientes' : 'Todavía no hay clientes'}
          </p>
          {!busqueda && (
            <Link to="/clientes/nuevo" className="btn btn-primary mt-4 inline-flex">
              <Plus size={15} /> Agregar primer cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {GRUPOS.map(grupo => (
            <GrupoClientes
              key={grupo.key}
              grupo={grupo}
              clientes={clientesPorGrupo[grupo.key] || []}
              pendientesPorCliente={pendientesPorCliente}
              vencidosPorCliente={vencidosPorCliente}
            />
          ))}
        </div>
      )}
    </div>
  )
}
