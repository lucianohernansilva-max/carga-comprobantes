import { useState, useMemo } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash2, X, Check, AlertTriangle, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { getInscripciones, saveInscripcion, deleteInscripcion } from '../db/store.js'

const ESTADOS = ['vigente', 'vencida', 'en_tramite', 'no_aplica']
const ESTADO_LABELS = { vigente: 'Vigente', vencida: 'Vencida', en_tramite: 'En trámite', no_aplica: 'N/A' }
const ESTADO_STYLES = {
  vigente:    'bg-green-100 text-green-700',
  vencida:    'bg-red-100 text-red-700',
  en_tramite: 'bg-blue-100 text-blue-700',
  no_aplica:  'bg-gray-100 text-gray-500',
}

function urgencyStyle(inscripcion) {
  if (inscripcion.estado === 'vencida') return 'border-l-4 border-red-500 bg-red-50'
  if (!inscripcion.fechaVencimiento || inscripcion.estado === 'no_aplica') return 'border-l-4 border-transparent bg-white'
  const dias = differenceInDays(parseISO(inscripcion.fechaVencimiento), new Date())
  if (dias < 0)   return 'border-l-4 border-red-500 bg-red-50'
  if (dias <= (inscripcion.diasRecordatorio || 30)) return 'border-l-4 border-orange-400 bg-orange-50'
  return 'border-l-4 border-transparent bg-white'
}

function diasLabel(inscripcion) {
  if (!inscripcion.fechaVencimiento) return null
  const dias = differenceInDays(parseISO(inscripcion.fechaVencimiento), new Date())
  if (dias < 0)  return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Vencida hace {-dias}d</span>
  if (dias === 0) return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Hoy</span>
  if (dias <= 7)  return <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{dias}d</span>
  if (dias <= 30) return <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">{dias}d</span>
  return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{dias}d</span>
}

const EMPTY_FORM = { nombre: '', organismo: '', fechaVencimiento: '', diasRecordatorio: 30, notas: '', estado: 'vigente', clienteId: '' }

function InscripcionModal({ inscripcion, clientes, onClose, onSave }) {
  const [form, setForm] = useState(inscripcion
    ? { ...inscripcion }
    : { ...EMPTY_FORM }
  )
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const guardar = () => {
    if (!form.nombre.trim() || !form.clienteId) return
    saveInscripcion(form)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-96 mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">{inscripcion?.id ? 'Editar inscripción' : 'Nueva inscripción'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label">Cliente *</label>
            <select className="form-select" value={form.clienteId} onChange={e => set('clienteId', e.target.value)}>
              <option value="">Seleccionar cliente…</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Nombre del trámite *</label>
            <input className="form-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Habilitación municipal, Certificado AFIP…" />
          </div>
          <div>
            <label className="form-label">Organismo</label>
            <input className="form-input" value={form.organismo} onChange={e => set('organismo', e.target.value)} placeholder="AFIP, Municipalidad, SENASA…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Fecha de vencimiento</label>
              <input type="date" className="form-input" value={form.fechaVencimiento} onChange={e => set('fechaVencimiento', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Recordatorio (días antes)</label>
              <input type="number" min="1" max="365" className="form-input" value={form.diasRecordatorio} onChange={e => set('diasRecordatorio', Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Notas <span className="font-normal text-gray-400">(opcional)</span></label>
            <textarea className="form-textarea" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Observaciones…" />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn btn-secondary flex-1 btn-sm">Cancelar</button>
          <button onClick={guardar} className="btn btn-primary flex-1 btn-sm">Guardar</button>
        </div>
      </div>
    </div>
  )
}

export default function Inscripciones() {
  const { clientes, inscripciones, refresh } = useApp()
  const [filtroCliente, setFiltro] = useState('')
  const [filtroEstado, setFiltroE] = useState('')
  const [modal, setModal] = useState(null) // null | 'nueva' | inscripcion-obj
  const [confirmDelete, setConfirmDelete] = useState(null)

  const hoy = new Date().toISOString().slice(0, 10)

  const items = useMemo(() => {
    return inscripciones
      .filter(i => !filtroCliente || i.clienteId === filtroCliente)
      .filter(i => !filtroEstado  || i.estado === filtroEstado)
      .sort((a, b) => {
        if (!a.fechaVencimiento) return 1
        if (!b.fechaVencimiento) return -1
        return a.fechaVencimiento.localeCompare(b.fechaVencimiento)
      })
  }, [inscripciones, filtroCliente, filtroEstado])

  const proximas = useMemo(() => inscripciones.filter(i => {
    if (!i.fechaVencimiento || i.estado === 'no_aplica') return false
    const dias = differenceInDays(parseISO(i.fechaVencimiento), new Date())
    return dias >= 0 && dias <= (i.diasRecordatorio || 30)
  }).length, [inscripciones])

  const vencidas = inscripciones.filter(i => {
    if (!i.fechaVencimiento) return false
    const dias = differenceInDays(parseISO(i.fechaVencimiento), new Date())
    return dias < 0 && i.estado !== 'no_aplica'
  }).length

  const eliminar = (id) => {
    deleteInscripcion(id)
    refresh()
    setConfirmDelete(null)
  }

  return (
    <div className="p-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inscripciones y certificados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Habilitaciones, certificados y trámites con renovación periódica</p>
        </div>
        <button onClick={() => setModal('nueva')} className="btn btn-primary btn-sm">
          <Plus size={14} /> Nueva inscripción
        </button>
      </div>

      {/* Alertas */}
      {(vencidas > 0 || proximas > 0) && (
        <div className="space-y-2 mb-4">
          {vencidas > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{vencidas} inscripción{vencidas !== 1 ? 'es' : ''} vencida{vencidas !== 1 ? 's' : ''} sin renovar</p>
            </div>
          )}
          {proximas > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-4 py-2.5">
              <Clock size={16} className="text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700 font-medium">{proximas} inscripción{proximas !== 1 ? 'es' : ''} próxima{proximas !== 1 ? 's' : ''} a vencer</p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="form-select text-xs py-1.5 w-auto" value={filtroCliente} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="form-select text-xs py-1.5 w-auto" value={filtroEstado} onChange={e => setFiltroE(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
        </select>
        <span className="text-xs text-gray-400 self-center ml-auto">{items.length} registro{items.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-14 text-center">
          <Check size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">Sin inscripciones registradas</p>
          <p className="text-xs text-gray-400 mt-1">Usá el botón "Nueva inscripción" para agregar habilitaciones o certificados</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => {
            const cliente = clientes.find(c => c.id === item.clienteId)
            return (
              <div key={item.id} className={`rounded-xl border border-gray-200 overflow-hidden ${urgencyStyle(item)}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Fecha */}
                  <div className="w-20 shrink-0 text-center">
                    {item.fechaVencimiento ? (
                      <>
                        <p className="text-sm font-bold text-gray-800">
                          {format(parseISO(item.fechaVencimiento), 'dd/MM/yy', { locale: es })}
                        </p>
                        {diasLabel(item)}
                      </>
                    ) : (
                      <p className="text-xs text-gray-300">Sin fecha</p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {cliente?.nombre || '—'}
                      {item.organismo && <> · <span className="text-gray-400">{item.organismo}</span></>}
                    </p>
                    {item.notas && <p className="text-xs text-gray-400 italic truncate mt-0.5">{item.notas}</p>}
                  </div>

                  {/* Estado */}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${ESTADO_STYLES[item.estado]}`}>
                    {ESTADO_LABELS[item.estado]}
                  </span>

                  {/* Acciones */}
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setModal(item)}
                      className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(item)}
                      className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal alta/edición */}
      {modal !== null && (
        <InscripcionModal
          inscripcion={modal === 'nueva' ? null : modal}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={refresh}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-5 w-72 mx-4">
            <p className="text-sm font-bold text-gray-800 mb-2">¿Eliminar inscripción?</p>
            <p className="text-xs text-gray-500 mb-4">"{confirmDelete.nombre}" será eliminada permanentemente.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary flex-1 btn-sm">Cancelar</button>
              <button onClick={() => eliminar(confirmDelete.id)} className="btn btn-danger flex-1 btn-sm">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
