import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Download, Upload, Settings } from 'lucide-react'
import { getConfig, saveConfig, getTiposObligacion, saveTipoObligacion, deleteTipoObligacion, getClientes, getVencimientos, getObligacionesCliente } from '../db/store.js'
import { PATRONES, PATRONES_LABELS } from '../db/fechas.js'
import { useApp } from '../context/AppContext.jsx'

const TABLA_KEYS = ['iva','autonomos','f931','lsd','casasParticulares','iibbCm','gananciasHumanas','bienesPersonales']
const TABLA_LABELS = {
  iva: 'IVA', autonomos: 'Autónomos', f931: 'F931', lsd: 'LSD',
  casasParticulares: 'Casas Particulares', iibbCm: 'IIBB CM',
  gananciasHumanas: 'Ganancias Humanas', bienesPersonales: 'Bienes Personales',
}

export default function Configuracion() {
  const { tipos, refresh } = useApp()
  const [config, setConfig] = useState(getConfig())
  const [tablaKey, setTablaKey] = useState('iva')
  const [saved, setSaved] = useState(false)
  const [showNuevoTipo, setShowNuevoTipo] = useState(false)
  const [nuevoTipo, setNuevoTipo] = useState({ nombre:'', descripcion:'', periodicidad:'mensual', patron: PATRONES.PATRON_DIA_FIJO, configuracion: { dia: 20 } })

  const saveAndNotify = () => {
    saveConfig(config)
    refresh()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const setTabla = (key, digito, valor) => {
    setConfig(c => ({
      ...c,
      tablaAfip: {
        ...c.tablaAfip,
        [key]: { ...c.tablaAfip[key], [digito]: Number(valor) }
      }
    }))
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

      {/* Tabla AFIP */}
      <div className="card-padded">
        <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Tabla de vencimientos AFIP por terminación de CUIT</p>
        <div className="flex gap-2 mb-3 flex-wrap">
          {TABLA_KEYS.map(k => (
            <button key={k} onClick={() => setTablaKey(k)}
              className={`px-2.5 py-1 rounded text-xs font-semibold ${tablaKey === k ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {TABLA_LABELS[k]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[0,1,2,3,4,5,6,7,8,9].map(d => (
            <div key={d}>
              <label className="form-label text-center block">…{d}</label>
              <input type="number" min="1" max="31" className="form-input text-center text-sm"
                value={config.tablaAfip?.[tablaKey]?.[d] ?? ''}
                onChange={e => setTabla(tablaKey, d, e.target.value)} />
            </div>
          ))}
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

      {/* Guardar */}
      <button onClick={saveAndNotify} className={`btn w-full ${saved ? 'btn-success' : 'btn-primary'}`}>
        <Save size={15} /> {saved ? '✓ Guardado' : 'Guardar configuración'}
      </button>
    </div>
  )
}
