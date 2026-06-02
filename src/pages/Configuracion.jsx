import { useState } from 'react'
import { Save, Plus, Trash2, Download, Upload, Settings, LogOut, CalendarDays, RefreshCw, Calendar, ChevronDown } from 'lucide-react'
import { getConfig, saveConfig, getTiposObligacion, saveTipoObligacion, deleteTipoObligacion, getClientes, getVencimientos, getObligacionesCliente, CALENDARIO_AFIP_2026 } from '../db/store.js'
import { PATRONES, PATRONES_LABELS } from '../db/fechas.js'
import { useApp } from '../context/AppContext.jsx'
import { getFeriadosExtra, saveFeriadosExtra, listarFeriadosAnio } from '../db/feriados.js'
import { useAuth } from '../auth/AuthContext.jsx'
import CambiarPassword from '../components/CambiarPassword.jsx'
import { generarVencimientosTodos, recalcularFechasVencimientos, regenerarVencimientosMonotributistas } from '../db/generador.js'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

// Obligaciones con calendario editable
const TIPOS_CALENDARIO = [
  { id: 'iva-mensual',                   label: 'IVA',             patron: 'cuit', tablaKey: 'iva' },
  { id: 'f931',                          label: 'F931',            patron: 'cuit', tablaKey: 'f931' },
  { id: 'autonomos-aportes',             label: 'Autónomos',       patron: 'cuit', tablaKey: 'autonomos' },
  { id: 'lsd',                           label: 'LSD',             patron: 'cuit', tablaKey: 'lsd' },
  { id: 'casas-particulares',            label: 'Casas Part.',     patron: 'cuit', tablaKey: 'casasParticulares' },
  { id: 'iibb-cm',                       label: 'IIBB CM',         patron: 'cuit', tablaKey: 'iibbCm' },
  { id: 'anticipos-ganancias-juridicas', label: 'Anticipos PJ',    patron: 'cuit', tablaKey: 'gananciasSociedades' },
  { id: 'ganancias-anual-humanas',       label: 'Gan. PH DDJJ',   patron: 'cuit', tablaKey: 'gananciasHumanasDDJJ' },
  { id: 'monotributo-cuota',             label: 'Monotributo',     patron: 'fijo' },
  { id: 'iibb-local',                    label: 'IIBB Provincial', patron: 'provincia' },
]

// Grupos CUIT — al editar un grupo se replica el día para todos sus dígitos
const GRUPOS_CUIT = [
  { label: '0 al 3', digits: [0,1,2,3] },
  { label: '4 al 6', digits: [4,5,6] },
  { label: '7 al 9', digits: [7,8,9] },
]

export default function Configuracion() {
  const { tipos, refresh } = useApp()
  const { onLogout }       = useAuth()
  const [config, setConfig] = useState(getConfig())
  const [saved, setSaved]         = useState(false)
  const [regenerando, setRegenerando] = useState(false)
  const [calSaved, setCalSaved]   = useState(false)
  const [showNuevoTipo, setShowNuevoTipo] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState({ nombre:'', descripcion:'', periodicidad:'mensual', patron: PATRONES.PATRON_DIA_FIJO, configuracion: { dia: 20 } })
  const anioActual = new Date().getFullYear()
  const [calTipoId, setCalTipoId] = useState('iva-mensual')
  const [calAnio, setCalAnio]     = useState(anioActual)
  const [calProvincia, setCalProvincia] = useState('Chaco')
  const [editandoGrupos, setEditandoGrupos] = useState(false)
  const [gruposEdit, setGruposEdit]   = useState('')   // comma-sep string while editing
  const [nuevaProvNombre, setNuevaProvNombre] = useState('')
  const [showNuevaProv, setShowNuevaProv]     = useState(false)
  const [feriadosAnio, setFeriadosAnio] = useState(anioActual)
  const [feriadosExtra, setFeriadosExtra_] = useState(getFeriadosExtra)
  const [nuevoFeriado, setNuevoFeriado] = useState({ fecha: '', nombre: '' })

  const calTipo = TIPOS_CALENDARIO.find(t => t.id === calTipoId)

  // ── Helpers de lectura/escritura del calendario ───────────────────────────

  // CUIT — lee el primer dígito del grupo (todos deberían ser iguales)
  const readGrupo = (tablaKey, anio, mes, digits) => {
    const v = config.tablaAfipCalendario?.[tablaKey]?.[String(anio)]?.[String(mes)]?.[String(digits[0])]
    return v != null ? v : ''
  }

  // CUIT — escribe el mismo día para todos los dígitos del grupo
  const setGrupo = (tablaKey, anio, mes, digits, valor) => {
    const v = valor === '' ? undefined : Number(valor)
    setConfig(c => {
      const cal    = { ...(c.tablaAfipCalendario || {}) }
      const byKey  = { ...(cal[tablaKey] || {}) }
      const byAnio = { ...(byKey[String(anio)] || {}) }
      const byMes  = { ...(byAnio[String(mes)] || {}) }
      for (const d of digits) {
        if (v == null || isNaN(v)) delete byMes[String(d)]
        else byMes[String(d)] = v
      }
      byAnio[String(mes)] = byMes
      byKey[String(anio)] = byAnio
      cal[tablaKey]       = byKey
      return { ...c, tablaAfipCalendario: cal }
    })
  }

  // Día fijo (Monotributo)
  const readFijo = (oblId, anio, mes) =>
    config.tablaFechasFijas?.[oblId]?.[String(anio)]?.[String(mes)] ?? ''

  const setFijo = (oblId, anio, mes, valor) => {
    const v = valor === '' ? undefined : Number(valor)
    setConfig(c => {
      const t      = { ...(c.tablaFechasFijas || {}) }
      const byId   = { ...(t[oblId] || {}) }
      const byAnio = { ...(byId[String(anio)] || {}) }
      if (v == null || isNaN(v)) delete byAnio[String(mes)]
      else byAnio[String(mes)] = v
      byId[String(anio)] = byAnio
      t[oblId]           = byId
      return { ...c, tablaFechasFijas: t }
    })
  }

  // IIBB Provincial — nueva estructura con grupos de CUIT por provincia

  // Lee los grupos configurados para una provincia
  const getGruposProvincia = (prov) =>
    config.configuracionProvincias?.[prov.toLowerCase()]?.grupos || []

  // Guarda los grupos de una provincia
  const setGruposProvincia = (prov, grupos) => {
    setConfig(c => ({
      ...c,
      configuracionProvincias: {
        ...(c.configuracionProvincias || {}),
        [prov.toLowerCase()]: {
          ...(c.configuracionProvincias?.[prov.toLowerCase()] || {}),
          grupos,
        },
      },
    }))
  }

  // Devuelve lista de provincias configuradas (con nombre capitalizado para display)
  const provinciasConfiguradas = Object.keys(config.configuracionProvincias || {})
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))

  // Lee el día para provincia+grupo+mes+año
  const readProvGrupo = (prov, grupo, anio, mes) =>
    config.tablaFechasProvincia?.[prov.toLowerCase()]?.[String(anio)]?.[String(mes)]?.[grupo] ?? ''

  // Escribe el día para provincia+grupo+mes+año
  const setProvGrupo = (prov, grupo, anio, mes, valor) => {
    const v = valor === '' ? undefined : Number(valor)
    setConfig(c => {
      const t      = { ...(c.tablaFechasProvincia || {}) }
      const byProv = { ...(t[prov.toLowerCase()] || {}) }
      const byAnio = { ...(byProv[String(anio)] || {}) }
      const byMes  = { ...(byAnio[String(mes)] || {}) }
      if (v == null || isNaN(v)) delete byMes[grupo]
      else byMes[grupo] = v
      byAnio[String(mes)]   = byMes
      byProv[String(anio)]  = byAnio
      t[prov.toLowerCase()] = byProv
      return { ...c, tablaFechasProvincia: t }
    })
  }

  // Agrega una nueva provincia con grupos por defecto
  const agregarProvincia = (nombre) => {
    const key = nombre.toLowerCase().trim()
    if (!key) return
    setConfig(c => ({
      ...c,
      configuracionProvincias: {
        ...(c.configuracionProvincias || {}),
        [key]: { grupos: ['0-4', '5-9'] },
      },
    }))
    setCalProvincia(nombre.trim())
  }

  // Carga datos AFIP 2026 precargados para TODOS los tipos CUIT a la vez
  const cargarDesdeAfip = () => {
    const tiposCuit = TIPOS_CALENDARIO.filter(t => t.patron === 'cuit')
    const disponibles = tiposCuit.filter(t => CALENDARIO_AFIP_2026[t.tablaKey]?.[String(calAnio)])
    if (disponibles.length === 0) {
      alert(`No hay datos AFIP precargados para el año ${calAnio}.`)
      return
    }
    setConfig(c => {
      const cal = { ...(c.tablaAfipCalendario || {}) }
      for (const t of disponibles) {
        const preloaded = CALENDARIO_AFIP_2026[t.tablaKey][String(calAnio)]
        const byKey = { ...(cal[t.tablaKey] || {}) }
        byKey[String(calAnio)] = { ...preloaded }
        cal[t.tablaKey] = byKey
      }
      return { ...c, tablaAfipCalendario: cal }
    })
  }

  // Guardar calendario, recalcular fechas existentes y generar vencimientos faltantes
  const guardarCalendario = () => {
    setRegenerando(true)
    setTimeout(() => {
      saveConfig(config)
      regenerarVencimientosMonotributistas()   // limpia IIBB Local y regenera mono
      recalcularFechasVencimientos(config)
      generarVencimientosTodos(getClientes())
      refresh()
      setRegenerando(false)
      setCalSaved(true)
      setTimeout(() => setCalSaved(false), 3000)
    }, 50)
  }

  const agregarFeriado = () => {
    if (!nuevoFeriado.fecha || !nuevoFeriado.nombre) return
    const updated = [...feriadosExtra, nuevoFeriado]
    saveFeriadosExtra(updated)
    setFeriadosExtra_(updated)
    setNuevoFeriado({ fecha: '', nombre: '' })
  }
  const quitarFeriado = (idx) => {
    const updated = feriadosExtra.filter((_, i) => i !== idx)
    saveFeriadosExtra(updated)
    setFeriadosExtra_(updated)
  }

  const saveAndNotify = () => {
    saveConfig(config)
    refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const crearTipo = () => {
    saveTipoObligacion({ ...nuevoTipo, activo: true, esCustom: true })
    setNuevoTipo({ nombre:'', descripcion:'', periodicidad:'mensual', patron: PATRONES.PATRON_DIA_FIJO, configuracion: { dia: 20 } })
    setShowNuevoTipo(false)
    refresh()
  }

  const exportarBackup = () => {
    const data = {
      version: 1,
      fecha: new Date().toISOString(),
      clientes: getClientes(),
      vencimientos: getVencimientos(),
      obligaciones: getObligacionesCliente(),
      tipos: getTiposObligacion(),
      config: getConfig(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup_vencimientos_${new Date().toISOString().slice(0,10)}.json`
    a.click()
  }

  const importarBackup = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!confirm('¿Restaurar backup? Esto reemplazará todos los datos actuales.')) return
        if (data.clientes)     localStorage.setItem('vc_clientes',        JSON.stringify(data.clientes))
        if (data.vencimientos) localStorage.setItem('vc_vencimientos',    JSON.stringify(data.vencimientos))
        if (data.obligaciones) localStorage.setItem('vc_obligaciones',    JSON.stringify(data.obligaciones))
        if (data.tipos)        localStorage.setItem('vc_tipos_obligacion', JSON.stringify(data.tipos))
        if (data.config)       localStorage.setItem('vc_config',          JSON.stringify(data.config))
        localStorage.setItem('vc_initialized', 'true')
        refresh()
        alert('Backup restaurado correctamente.')
      } catch {
        alert('Error al leer el archivo de backup.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="p-5 max-w-3xl space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Settings size={20} className="text-primary" />
        <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
      </div>

      {/* Datos del estudio */}
      <div className="card-padded space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Datos del Estudio</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Nombre del estudio</label>
            <input className="form-input" value={config.estudio?.nombre || ''} onChange={e => setConfig(c => ({ ...c, estudio: { ...c.estudio, nombre: e.target.value } }))} />
          </div>
          <div>
            <label className="form-label">CUIT del contador</label>
            <input className="form-input" value={config.estudio?.cuit || ''} onChange={e => setConfig(c => ({ ...c, estudio: { ...c.estudio, cuit: e.target.value } }))} />
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="card-padded space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Días de alerta</p>
        <p className="text-xs text-gray-500">Notificar X días antes del vencimiento (separados por coma)</p>
        <input
          className="form-input"
          value={(config.alertasDias || [7,3,1]).join(', ')}
          onChange={e => {
            const arr = e.target.value.split(',').map(v => parseInt(v.trim())).filter(n => !isNaN(n))
            setConfig(c => ({ ...c, alertasDias: arr }))
          }}
        />
        <div>
          <label className="form-label">Horizonte de generación (meses)</label>
          <input type="number" min="1" max="24" className="form-input w-24"
            value={config.horizonte || 12}
            onChange={e => setConfig(c => ({ ...c, horizonte: Number(e.target.value) }))} />
        </div>
      </div>

      {/* Calendario de Vencimientos por Mes */}
      <div className="card-padded space-y-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Calendario de Vencimientos por Mes</p>
        </div>
        <p className="text-xs text-gray-500">
          Ingresá el día de vencimiento para cada mes. <span className="font-medium text-primary">Celdas en azul = fecha confirmada</span>;
          celdas vacías = advertencia naranja "pendiente de confirmar" en el vencimiento del cliente.
          Esta grilla es la <b>única fuente de verdad</b>: no se usa ningún cálculo automático.
        </p>

        {/* Fila superior: año + cargar AFIP */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCalAnio(a => a - 1)} className="btn btn-secondary btn-sm px-2">‹</button>
            <span className="font-bold text-sm text-gray-800 w-12 text-center">{calAnio}</span>
            <button onClick={() => setCalAnio(a => a + 1)} className="btn btn-secondary btn-sm px-2">›</button>
          </div>
          <button onClick={cargarDesdeAfip} className="btn btn-outline btn-sm ml-auto">
            <RefreshCw size={12} /> Cargar TODOS los datos AFIP {calAnio}
          </button>
        </div>

        {/* Chips de tipo */}
        <div className="flex gap-1 flex-wrap">
          {TIPOS_CALENDARIO.map(t => (
            <button key={t.id} onClick={() => setCalTipoId(t.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                calTipoId === t.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Panel de provincia — solo para IIBB Provincial */}
        {calTipo?.patron === 'provincia' && (() => {
          const gruposProv = getGruposProvincia(calProvincia)
          return (
            <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
              {/* Selector de provincia */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-purple-700">Provincia:</span>
                {provinciasConfiguradas.map(p => (
                  <button key={p} onClick={() => { setCalProvincia(p); setEditandoGrupos(false) }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      calProvincia === p
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
                    }`}>{p}</button>
                ))}
                {!showNuevaProv
                  ? <button onClick={() => setShowNuevaProv(true)}
                      className="px-2.5 py-0.5 rounded-full text-xs font-semibold border border-dashed border-purple-400 text-purple-500 hover:bg-purple-100">
                      + Nueva provincia
                    </button>
                  : <div className="flex items-center gap-1">
                      <input
                        className="form-input text-xs py-0.5 w-32"
                        value={nuevaProvNombre}
                        onChange={e => setNuevaProvNombre(e.target.value)}
                        placeholder="Ej: Corrientes"
                        autoFocus
                      />
                      <button
                        onClick={() => { agregarProvincia(nuevaProvNombre); setNuevaProvNombre(''); setShowNuevaProv(false) }}
                        disabled={!nuevaProvNombre.trim()}
                        className="btn btn-primary btn-sm px-2 py-0.5 text-xs">Agregar</button>
                      <button onClick={() => { setShowNuevaProv(false); setNuevaProvNombre('') }}
                        className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
                    </div>
                }
              </div>

              {/* Grupos de CUIT de la provincia seleccionada */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-purple-600 font-medium">Grupos CUIT:</span>
                {!editandoGrupos
                  ? <>
                      {gruposProv.map(g => (
                        <span key={g} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono font-semibold">{g}</span>
                      ))}
                      <button
                        onClick={() => { setGruposEdit(gruposProv.join(', ')); setEditandoGrupos(true) }}
                        className="text-xs text-purple-500 underline hover:text-purple-700 ml-1">
                        ✎ Editar grupos
                      </button>
                    </>
                  : <div className="flex items-center gap-1 flex-1">
                      <input
                        className="form-input text-xs py-0.5 flex-1"
                        value={gruposEdit}
                        onChange={e => setGruposEdit(e.target.value)}
                        placeholder="0-1, 2-3, 4-5, 6-7, 8-9"
                      />
                      <button
                        onClick={() => {
                          const grupos = gruposEdit.split(',').map(s => s.trim()).filter(Boolean)
                          setGruposProvincia(calProvincia, grupos)
                          setEditandoGrupos(false)
                        }}
                        className="btn btn-primary btn-sm px-2 py-0.5 text-xs">OK</button>
                      <button onClick={() => setEditandoGrupos(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs px-1">✕</button>
                    </div>
                }
              </div>
              {gruposProv.length === 0 && (
                <p className="text-xs text-purple-500">
                  Sin grupos configurados. Hacé clic en "Editar grupos" para definirlos.
                </p>
              )}
            </div>
          )
        })()}

        {/* Grilla */}
        <div className="overflow-x-auto">
          {calTipo?.patron === 'provincia' && getGruposProvincia(calProvincia).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Configurá los grupos de CUIT para {calProvincia} primero.</p>
          ) : (
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left py-1.5 pr-4 text-gray-500 font-semibold w-14">Mes</th>
                {calTipo?.patron === 'cuit'
                  ? GRUPOS_CUIT.map(g => (
                      <th key={g.label} className="text-center py-1.5 px-2 text-gray-500 font-semibold whitespace-nowrap">
                        CUIT {g.label}
                      </th>
                    ))
                  : calTipo?.patron === 'provincia'
                    ? getGruposProvincia(calProvincia).map(g => (
                        <th key={g} className="text-center py-1.5 px-2 text-purple-600 font-semibold whitespace-nowrap">
                          CUIT {g}
                        </th>
                      ))
                    : <th className="text-center py-1.5 px-2 text-gray-500 font-semibold">Día</th>
                }
              </tr>
            </thead>
            <tbody>
              {MESES_CORTOS.map((label, idx) => {
                const mes = idx + 1
                return (
                  <tr key={mes} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-1 pr-4 text-gray-600 font-medium">{label}</td>

                    {calTipo?.patron === 'cuit'
                      ? GRUPOS_CUIT.map(g => {
                          const val = readGrupo(calTipo.tablaKey, calAnio, mes, g.digits)
                          return (
                            <td key={g.label} className="py-0.5 px-1.5">
                              <input type="number" min="1" max="31"
                                className={`w-14 text-center text-xs rounded border py-1 ${
                                  val !== '' ? 'border-primary bg-blue-50 font-semibold text-primary' : 'border-gray-200 text-gray-400'
                                }`}
                                value={val} placeholder="—"
                                onChange={e => setGrupo(calTipo.tablaKey, calAnio, mes, g.digits, e.target.value)}
                              />
                            </td>
                          )
                        })
                      : calTipo?.patron === 'fijo'
                        ? (() => {
                            const val = readFijo(calTipoId, calAnio, mes)
                            return (
                              <td className="py-0.5 px-1.5">
                                <input type="number" min="1" max="31"
                                  className={`w-14 text-center text-xs rounded border py-1 ${
                                    val !== '' ? 'border-primary bg-blue-50 font-semibold text-primary' : 'border-gray-200 text-gray-400'
                                  }`}
                                  value={val} placeholder="—"
                                  onChange={e => setFijo(calTipoId, calAnio, mes, e.target.value)}
                                />
                              </td>
                            )
                          })()
                        : getGruposProvincia(calProvincia).map(g => {
                            const val = readProvGrupo(calProvincia, g, calAnio, mes)
                            return (
                              <td key={g} className="py-0.5 px-1.5">
                                <input type="number" min="1" max="31"
                                  className={`w-14 text-center text-xs rounded border py-1 ${
                                    val !== '' ? 'border-purple-500 bg-purple-50 font-semibold text-purple-700' : 'border-gray-200 text-gray-400'
                                  }`}
                                  value={val} placeholder="—"
                                  onChange={e => setProvGrupo(calProvincia, g, calAnio, mes, e.target.value)}
                                />
                              </td>
                            )
                          })
                    }
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={guardarCalendario}
            disabled={regenerando}
            className={`btn btn-sm ${calSaved ? 'btn-success' : 'btn-primary'} shrink-0`}
          >
            {regenerando
              ? <><RefreshCw size={13} className="animate-spin" /> Actualizando…</>
              : calSaved
                ? <><Save size={13} /> ✓ Guardado y vencimientos actualizados</>
                : <><Save size={13} /> Guardar y actualizar vencimientos</>
            }
          </button>
        </div>
      </div>

      {/* Tipos custom */}
      <div className="card-padded space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Tipos de obligación personalizados</p>
          <button onClick={() => setShowNuevoTipo(s => !s)} className="btn btn-primary btn-sm">
            <Plus size={13} /> Nuevo tipo
          </button>
        </div>

        {showNuevoTipo && (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="form-label">Nombre</label>
                <input className="form-input" value={nuevoTipo.nombre} onChange={e => setNuevoTipo(t => ({ ...t, nombre: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Periodicidad</label>
                <select className="form-select" value={nuevoTipo.periodicidad} onChange={e => setNuevoTipo(t => ({ ...t, periodicidad: e.target.value }))}>
                  {['mensual','bimestral','trimestral','semestral','anual','personalizado'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Descripción</label>
              <input className="form-input" value={nuevoTipo.descripcion} onChange={e => setNuevoTipo(t => ({ ...t, descripcion: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Patrón de cálculo</label>
              <select className="form-select" value={nuevoTipo.patron} onChange={e => setNuevoTipo(t => ({ ...t, patron: e.target.value }))}>
                {Object.entries(PATRONES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {nuevoTipo.patron === PATRONES.PATRON_DIA_FIJO && (
              <div>
                <label className="form-label">Día del mes</label>
                <input type="number" min="1" max="31" className="form-input w-24"
                  value={nuevoTipo.configuracion.dia || 20}
                  onChange={e => setNuevoTipo(t => ({ ...t, configuracion: { ...t.configuracion, dia: Number(e.target.value) } }))} />
              </div>
            )}
            <button onClick={crearTipo} className="btn btn-success w-full" disabled={!nuevoTipo.nombre}>
              Crear tipo de obligación
            </button>
          </div>
        )}

        {tipos.filter(t => t.esCustom).length === 0 && !showNuevoTipo && (
          <p className="text-xs text-gray-400">No hay tipos personalizados</p>
        )}

        {tipos.filter(t => t.esCustom).map(t => (
          <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{t.nombre}</p>
              <p className="text-xs text-gray-500">{t.descripcion} · {PATRONES_LABELS[t.patron]}</p>
            </div>
            <button onClick={() => { if(confirm('¿Eliminar este tipo?')) { deleteTipoObligacion(t.id); refresh() } }}
              className="btn btn-danger btn-sm">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Backup */}
      <div className="card-padded space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Backup de datos</p>
        <div className="flex gap-3">
          <button onClick={exportarBackup} className="btn btn-outline flex-1">
            <Download size={14} /> Exportar backup (.json)
          </button>
          <label className="btn btn-outline flex-1 cursor-pointer">
            <Upload size={14} /> Restaurar backup
            <input type="file" accept=".json" className="hidden" onChange={importarBackup} />
          </label>
        </div>
        <p className="text-xs text-gray-400">El backup incluye todos los clientes, vencimientos y configuración.</p>
      </div>

      {/* Feriados nacionales */}
      <div className="card-padded space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Feriados nacionales</p>
        </div>

        {/* Navegador de año */}
        <div className="flex items-center gap-3">
          <button onClick={() => setFeriadosAnio(a => a - 1)} className="btn btn-secondary btn-sm px-2">‹</button>
          <span className="font-semibold text-sm text-gray-700">{feriadosAnio}</span>
          <button onClick={() => setFeriadosAnio(a => a + 1)} className="btn btn-secondary btn-sm px-2">›</button>
        </div>

        {/* Lista de feriados del año */}
        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {listarFeriadosAnio(feriadosAnio).map((f, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50">
              <span className="text-gray-600 font-mono">{f.fecha}</span>
              <span className="text-gray-800 flex-1 mx-3">{f.nombre}</span>
              {f.tipo === 'extra' ? (
                <button onClick={() => quitarFeriado(feriadosExtra.findIndex(e => e.fecha === f.fecha && e.nombre === f.nombre))}
                  className="text-danger hover:text-red-700"><Trash2 size={12} /></button>
              ) : (
                <span className="badge bg-blue-100 text-blue-600 text-xs">Nacional</span>
              )}
            </div>
          ))}
        </div>

        {/* Agregar feriado extra */}
        <p className="text-xs font-semibold text-gray-600">Agregar feriado adicional o puente</p>
        <div className="flex gap-2">
          <input type="date" className="form-input text-xs py-1.5 flex-1"
            value={nuevoFeriado.fecha} onChange={e => setNuevoFeriado(f => ({ ...f, fecha: e.target.value }))} />
          <input className="form-input text-xs py-1.5 flex-1"
            placeholder="Nombre del feriado"
            value={nuevoFeriado.nombre} onChange={e => setNuevoFeriado(f => ({ ...f, nombre: e.target.value }))} />
          <button onClick={agregarFeriado} disabled={!nuevoFeriado.fecha || !nuevoFeriado.nombre}
            className="btn btn-primary btn-sm px-3"><Plus size={13} /></button>
        </div>
        <p className="text-xs text-gray-400">Los feriados se usan para ajustar automáticamente las fechas de vencimiento al día hábil anterior.</p>
      </div>

      {/* Seguridad */}
      <CambiarPassword />

      {/* Cerrar sesión */}
      <div className="card-padded border-red-200 bg-red-50 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Cerrar sesión</p>
          <p className="text-xs text-gray-500">La próxima vez que abras la app se pedirá la contraseña.</p>
        </div>
        <button
          onClick={() => { if (confirm('¿Cerrar sesión?')) onLogout() }}
          className="btn btn-danger btn-sm"
        >
          <LogOut size={13} /> Salir
        </button>
      </div>

      {/* Regenerar vencimientos */}
      <div className="card-padded space-y-2">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Regenerar vencimientos</p>
        <p className="text-xs text-gray-500">
          Genera vencimientos faltantes para todos los clientes activos usando la configuración actual.
          No borra ni modifica los vencimientos ya existentes.
        </p>
        <button
          onClick={() => {
            if (!confirm('¿Regenerar vencimientos de todos los clientes? Esto puede tardar unos segundos.')) return
            setRegenerando(true)
            setTimeout(() => {
              generarVencimientosTodos(getClientes())
              refresh()
              setRegenerando(false)
            }, 50)
          }}
          disabled={regenerando}
          className="btn btn-outline w-full"
        >
          <RefreshCw size={14} className={regenerando ? 'animate-spin' : ''} />
          {regenerando ? 'Regenerando…' : 'Regenerar vencimientos de todos los clientes'}
        </button>
      </div>

      {/* Guardar */}
      <button onClick={saveAndNotify} className={`btn w-full ${saved ? 'btn-success' : 'btn-primary'}`}>
        <Save size={15} /> {saved ? '✓ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  )
}
