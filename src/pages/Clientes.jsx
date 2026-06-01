import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Upload, Users } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import ImportarClientesModal from '../components/ImportarClientesModal.jsx'

const CONDICION_LABELS = {
  monotributista:     'Monotributista',
  responsable_inscripto: 'Resp. Inscripto',
  exento:             'Exento',
  autonomo:           'Autónomo',
}

const CONDICION_COLORS = {
  monotributista:     'bg-green-100 text-green-700',
  responsable_inscripto: 'bg-blue-100 text-blue-700',
  exento:             'bg-gray-100 text-gray-600',
  autonomo:           'bg-purple-100 text-purple-700',
}

export default function Clientes() {
  const { clientes, vencimientos, refresh } = useApp()
  const [busqueda, setBusqueda]         = useState('')
  const [modalImportar, setModalImportar] = useState(false)

  const filtrados = clientes.filter(c => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(q) || c.cuit.includes(q)
  })

  const pendientesPorCliente = (clienteId) =>
    vencimientos.filter(v =>
      v.clienteId === clienteId && ['pendiente','en_proceso'].includes(v.estado)
    ).length

  const vencidosPorCliente = (clienteId) => {
    const hoy = new Date().toISOString().slice(0,10)
    return vencimientos.filter(v =>
      v.clienteId === clienteId &&
      v.fecha < hoy &&
      !['pagado','presentado','no_aplica'].includes(v.estado)
    ).length
  }

  return (
    <div className="p-5 max-w-3xl">
      {modalImportar && (
        <ImportarClientesModal
          onClose={() => setModalImportar(false)}
          onImportado={refresh}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
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
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="form-input pl-9"
          placeholder="Buscar por nombre o CUIT..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-gray-500">No se encontraron clientes</p>
          <Link to="/clientes/nuevo" className="btn btn-primary mt-4 inline-flex">
            <Plus size={15} /> Agregar primer cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => {
            const venc = vencidosPorCliente(c.id)
            const pend = pendientesPorCliente(c.id)
            return (
              <Link
                key={c.id}
                to={`/clientes/${c.id}`}
                className="card flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {c.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre}</p>
                    {!c.activo && <span className="badge badge-no_aplica text-xs">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-500">CUIT {c.cuit}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`badge text-xs ${CONDICION_COLORS[c.condicionFiscal] || 'bg-gray-100 text-gray-600'}`}>
                    {CONDICION_LABELS[c.condicionFiscal] || c.condicionFiscal}
                  </span>
                  {venc > 0 && (
                    <span className="badge bg-red-100 text-danger text-xs">
                      {venc} vencido{venc > 1 ? 's' : ''}
                    </span>
                  )}
                  {venc === 0 && pend > 0 && (
                    <span className="badge bg-yellow-100 text-yellow-700 text-xs">
                      {pend} pend.
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
