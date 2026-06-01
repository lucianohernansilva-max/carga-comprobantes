import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, RefreshCw } from 'lucide-react'
import { saveCliente, getCliente, deleteCliente, getTiposObligacion, getObligacionesCliente, saveObligacionCliente, deleteObligacionCliente } from '../db/store.js'
import { generarVencimientosCliente } from '../db/generador.js'
import { terminacionCuit } from '../db/fechas.js'

const CONDICIONES = [
  { value: 'monotributista',       label: 'Monotributista' },
  { value: 'responsable_inscripto',label: 'Responsable Inscripto' },
  { value: 'exento',               label: 'Exento' },
  { value: 'autonomo',             label: 'Autónomo' },
]
const CATEGORIAS_MONO = ['A','B','C','D','E','F','G','H','I','J','K']
const CATEGORIAS_AUTO = ['I','II','III','IV','V']
const PROVINCIAS = ['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán']

const EMPTY = {
  nombre: '', cuit: '', condicionFiscal: 'responsable_inscripto',
  categoriaMonotributo: '', categoriaAutonomo: '', tipoPersona: 'humana',
  fechaCierreEjercicio: '', actividadPrincipal: '', jurisdiccionesIIBB: [],
  liquidaAnticiposGanancias: false, tieneEmpleados: false, cantidadEmpleados: '',
  notas: '', activo: true,
  email: '', whatsapp: '',
}

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [obligaciones, setObligaciones] = useState([])  // [{tipoObligacionId, activa, id?}]
  const [tipos, setTipos] = useState([])

  useEffect(() => {
    setTipos(getTiposObligacion().filter(t => t.activo))
    if (isEdit) {
      const c = getCliente(id)
      if (c) setForm({ ...EMPTY, ...c, cantidadEmpleados: c.cantidadEmpleados ?? '', fechaCierreEjercicio: c.fechaCierreEjercicio ?? '' })
      const obls = getObligacionesCliente(id)
      setObligaciones(obls)
    }
  }, [id, isEdit])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleJurisdiccion = (prov) => {
    setForm(f => {
      const arr = f.jurisdiccionesIIBB || []
      return { ...f, jurisdiccionesIIBB: arr.includes(prov) ? arr.filter(p => p !== prov) : [...arr, prov] }
    })
  }

  const toggleObl = (tipoId) => {
    setObligaciones(prev => {
      const exist = prev.find(o => o.tipoObligacionId === tipoId)
      if (exist) return prev.map(o => o.tipoObligacionId === tipoId ? { ...o, activa: !o.activa } : o)
      return [...prev, { tipoObligacionId: tipoId, activa: true, configuracionExtra: {} }]
    })
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido'
    if (!form.cuit.trim())   e.cuit = 'El CUIT es requerido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    const data = {
      ...form,
      cantidadEmpleados: form.cantidadEmpleados !== '' ? Number(form.cantidadEmpleados) : null,
      fechaCierreEjercicio: form.fechaCierreEjercicio || null,
    }
    if (isEdit) data.id = id
    saveCliente(data)
    const clienteId = isEdit ? id : data.id

    // Guardar obligaciones
    for (const obl of obligaciones) {
      saveObligacionCliente({ ...obl, clienteId: clienteId || id })
    }

    // Generar vencimientos
    const cliente = getCliente(clienteId || id)
    if (cliente) generarVencimientosCliente(cliente)

    navigate(isEdit ? `/clientes/${id}` : '/clientes')
  }

  const handleDelete = () => {
    if (!confirm('¿Eliminar este cliente y todos sus datos?')) return
    deleteCliente(id)
    navigate('/clientes')
  }

  const oblActiva = (tipoId) => {
    const o = obligaciones.find(o => o.tipoObligacionId === tipoId)
    return o?.activa ?? false
  }

  return (
    <div className="p-5 max-w-2xl">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Datos básicos */}
        <div className="card-padded space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Datos básicos</p>

          <div>
            <label className="form-label">Nombre / Razón Social <span className="text-danger">*</span></label>
            <input className={`form-input ${errors.nombre ? 'error' : ''}`} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            {errors.nombre && <p className="form-error">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">CUIT <span className="text-danger">*</span></label>
              <input className={`form-input ${errors.cuit ? 'error' : ''}`} value={form.cuit}
                placeholder="20-12345678-9"
                onChange={e => set('cuit', e.target.value)} />
              {form.cuit && <p className="text-xs text-gray-500 mt-1">Terminación: {terminacionCuit(form.cuit)}</p>}
              {errors.cuit && <p className="form-error">{errors.cuit}</p>}
            </div>
            <div>
              <label className="form-label">Tipo de persona</label>
              <select className="form-select" value={form.tipoPersona} onChange={e => set('tipoPersona', e.target.value)}>
                <option value="humana">Persona Humana</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Condición fiscal</label>
            <select className="form-select" value={form.condicionFiscal} onChange={e => set('condicionFiscal', e.target.value)}>
              {CONDICIONES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {form.condicionFiscal === 'monotributista' && (
            <div>
              <label className="form-label">Categoría Monotributo</label>
              <select className="form-select" value={form.categoriaMonotributo} onChange={e => set('categoriaMonotributo', e.target.value)}>
                <option value="">— Sin categoría —</option>
                {CATEGORIAS_MONO.map(c => <option key={c} value={c}>Categoría {c}</option>)}
              </select>
            </div>
          )}

          {form.condicionFiscal === 'autonomo' && (
            <div>
              <label className="form-label">Categoría Autónomo</label>
              <select className="form-select" value={form.categoriaAutonomo} onChange={e => set('categoriaAutonomo', e.target.value)}>
                <option value="">— Sin categoría —</option>
                {CATEGORIAS_AUTO.map(c => <option key={c} value={c}>Categoría {c}</option>)}
              </select>
            </div>
          )}

          {form.tipoPersona === 'juridica' && (
            <div>
              <label className="form-label">Fecha cierre de ejercicio</label>
              <input type="text" className="form-input" value={form.fechaCierreEjercicio}
                placeholder="MM-DD (ej: 03-31 para 31/03)"
                onChange={e => set('fechaCierreEjercicio', e.target.value)} />
            </div>
          )}

          <div>
            <label className="form-label">Actividad principal</label>
            <input className="form-input" value={form.actividadPrincipal} onChange={e => set('actividadPrincipal', e.target.value)} />
          </div>

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="form-label">Email de contacto</label>
              <input type="email" className="form-input" value={form.email || ''} placeholder="correo@ejemplo.com"
                onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="form-label">WhatsApp</label>
              <input type="tel" className="form-input" value={form.whatsapp || ''} placeholder="3512345678"
                onChange={e => set('whatsapp', e.target.value)} />
            </div>
          </div>
        </div>

        {/* IIBB */}
        <div className="card-padded">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Jurisdicciones IIBB</p>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {PROVINCIAS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => toggleJurisdiccion(p)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  (form.jurisdiccionesIIBB || []).includes(p)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Empleados y anticipos */}
        <div className="card-padded space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Otras características</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.liquidaAnticiposGanancias} onChange={e => set('liquidaAnticiposGanancias', e.target.checked)} />
            <span className="text-sm text-gray-700">Liquida Anticipos de Ganancias</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.tieneEmpleados} onChange={e => set('tieneEmpleados', e.target.checked)} />
            <span className="text-sm text-gray-700">Tiene empleados en relación de dependencia</span>
          </label>
          {form.tieneEmpleados && (
            <div>
              <label className="form-label">Cantidad de empleados</label>
              <input type="number" min="0" className="form-input w-24" value={form.cantidadEmpleados}
                onChange={e => set('cantidadEmpleados', e.target.value)} />
            </div>
          )}
          <div>
            <label className="form-label">Notas</label>
            <textarea className="form-textarea" rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} />
          </div>
        </div>

        {/* Obligaciones */}
        <div className="card-padded">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Obligaciones activas</p>
          <div className="space-y-1.5">
            {tipos.map(t => (
              <label key={t.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1.5 rounded-lg">
                <input type="checkbox" className="mt-0.5 rounded" checked={oblActiva(t.id)} onChange={() => toggleObl(t.id)} />
                <div>
                  <p className="text-sm text-gray-800 font-medium">{t.nombre}</p>
                  <p className="text-xs text-gray-500">{t.descripcion}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex gap-3">
          <button onClick={handleSubmit} className="btn btn-primary flex-1">
            <Save size={15} /> {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
          {isEdit && (
            <button onClick={handleDelete} className="btn btn-danger">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
