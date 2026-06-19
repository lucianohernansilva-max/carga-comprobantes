import { useState, useRef } from 'react'
import { Upload, X, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import {
  leerExcel, detectarFormato, autoMapear, mapeoCompleto,
  parsearRows, bulkSaveComprobantes, ORIGENES, ORIGENES_LABELS, CAMPOS,
} from '../db/comprobantes.js'

const PASOS = { UPLOAD: 'upload', MAPEO: 'mapeo', RESULTADO: 'resultado' }

const fmt = (n) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

export default function ImportadorComprobantes({ clientes, onDone, onClose }) {
  const [paso, setPaso]           = useState(PASOS.UPLOAD)
  const [error, setError]         = useState('')
  const [cargando, setCargando]   = useState(false)

  // Paso 1
  const [clienteId, setClienteId] = useState(clientes[0]?.id || '')
  const [tipoSel, setTipoSel]     = useState('emitido')

  // Datos del Excel
  const [headers, setHeaders]     = useState([])
  const [rows, setRows]           = useState([])

  // Detección + mapeo
  const [origen, setOrigen]       = useState('')
  const [mapping, setMapping]     = useState({})
  const [showMapper, setShowMapper] = useState(false)

  // Resultado
  const [resultado, setResultado] = useState(null)

  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    if (!clienteId) { setError('Seleccioná un cliente antes de subir el archivo.'); return }
    setCargando(true); setError('')
    try {
      const { headers: hdr, rows: rs } = await leerExcel(file)
      setHeaders(hdr)
      setRows(rs)
      const fmt = detectarFormato(hdr)
      setOrigen(fmt || ORIGENES.MIS_COMPROBANTES)
      const map = autoMapear(hdr, fmt || ORIGENES.MIS_COMPROBANTES)
      setMapping(map)
      setShowMapper(!fmt || !mapeoCompleto(map, fmt || ORIGENES.MIS_COMPROBANTES))
      setPaso(PASOS.MAPEO)
    } catch (e) {
      setError('No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx / .xls).')
    } finally { setCargando(false) }
  }

  const handleOrigenChange = (nuevoOrigen) => {
    setOrigen(nuevoOrigen)
    const map = autoMapear(headers, nuevoOrigen)
    setMapping(map)
    setShowMapper(!mapeoCompleto(map, nuevoOrigen))
  }

  const setMap = (key, idx) => setMapping(m => ({ ...m, [key]: idx === '' ? undefined : Number(idx) }))

  const importar = () => {
    if (!mapeoCompleto(mapping, origen)) { setError('Completá todos los campos obligatorios del mapeo.'); return }
    setError('')
    const tipo = origen === ORIGENES.CARTA_PORTE ? 'emitido' : tipoSel
    const parsed = parsearRows(rows, mapping, origen, clienteId, tipo)
    if (!parsed.length) { setError('No se encontraron filas válidas en el archivo.'); return }
    bulkSaveComprobantes(parsed)
    setResultado({ count: parsed.length, origen, tipo })
    setPaso(PASOS.RESULTADO)
    onDone?.()
  }

  // Preview: primeras 5 filas con el mapeo actual
  const preview = rows.slice(0, 5).map(row =>
    CAMPOS[origen]?.map(c => {
      const idx = mapping[c.key]
      return { label: c.label, value: idx !== undefined ? String(row[idx] ?? '') : '—' }
    }) || []
  )

  const camposFaltantes = (CAMPOS[origen] || []).filter(c => c.required && mapping[c.key] === undefined)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">Importar comprobantes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ── PASO 1: Configuración + upload ── */}
          {paso === PASOS.UPLOAD && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Cliente</label>
                  <select className="form-select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                    <option value="">— Seleccioná un cliente —</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Tipo de comprobantes</label>
                  <select className="form-select" value={tipoSel} onChange={e => setTipoSel(e.target.value)}>
                    <option value="emitido">Emitidos</option>
                    <option value="recibido">Recibidos</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">Para Cartas de Porte el tipo se establece automáticamente como "Emitido".</p>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-colors"
                onClick={() => clienteId && fileRef.current?.click()}
              >
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">Arrastrá o hacé clic para subir el Excel</p>
                <p className="text-xs text-gray-400 mt-1">Mis Comprobantes (AFIP) · Portal IVA · Cartas de Porte</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </div>

              {cargando && <p className="text-xs text-primary text-center">Leyendo archivo…</p>}
              {error && <p className="text-xs text-danger">{error}</p>}
            </>
          )}

          {/* ── PASO 2: Detección + mapeo ── */}
          {paso === PASOS.MAPEO && (
            <>
              {/* Formato detectado */}
              <div className="space-y-1">
                <label className="form-label">Formato detectado</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.values(ORIGENES).map(o => (
                    <button key={o} onClick={() => handleOrigenChange(o)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${origen === o ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}>
                      {ORIGENES_LABELS[o]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aviso si faltan campos */}
              {camposFaltantes.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning font-medium">
                    No se detectaron automáticamente: {camposFaltantes.map(c => c.label).join(', ')}.
                    Seleccioná las columnas manualmente.
                  </p>
                </div>
              )}

              {/* Mapeador de columnas */}
              {showMapper && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">Mapeo de columnas</p>
                    <button className="text-xs text-primary hover:underline" onClick={() => setShowMapper(false)}>Ocultar</button>
                  </div>
                  <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
                    {(CAMPOS[origen] || []).map(campo => (
                      <div key={campo.key} className="flex items-center gap-2">
                        <label className={`text-xs w-36 shrink-0 ${campo.required ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                          {campo.label}{campo.required && <span className="text-danger"> *</span>}
                        </label>
                        <select
                          className={`form-select text-xs py-1 flex-1 ${campo.required && mapping[campo.key] === undefined ? 'border-danger' : ''}`}
                          value={mapping[campo.key] ?? ''}
                          onChange={e => setMap(campo.key, e.target.value)}
                        >
                          <option value="">— Sin mapear —</option>
                          {headers.map((h, i) => h && <option key={i} value={i}>{h}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showMapper && camposFaltantes.length === 0 && (
                <button className="text-xs text-gray-400 hover:text-primary" onClick={() => setShowMapper(true)}>
                  Editar mapeo de columnas
                </button>
              )}

              {/* Preview */}
              {preview.length > 0 && mapping && Object.keys(mapping).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Vista previa (primeras {preview.length} filas)</p>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50">
                        <tr>{preview[0]?.map((col, i) => <th key={i} className="px-2 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{col.label}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            {row.map((col, j) => <td key={j} className="px-2 py-1 text-gray-700 max-w-[120px] truncate">{col.value}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rows.length} filas en total</p>
                </div>
              )}

              {error && <p className="text-xs text-danger">{error}</p>}
            </>
          )}

          {/* ── PASO 3: Resultado ── */}
          {paso === PASOS.RESULTADO && resultado && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle size={40} className="mx-auto text-success" />
              <p className="text-base font-bold text-gray-900">
                {resultado.count} comprobantes importados
              </p>
              <p className="text-sm text-gray-500">
                {ORIGENES_LABELS[resultado.origen]} · {resultado.tipo === 'emitido' ? 'Emitidos' : 'Recibidos'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          {paso === PASOS.UPLOAD && (
            <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          )}
          {paso === PASOS.MAPEO && (
            <>
              <button onClick={() => { setPaso(PASOS.UPLOAD); setError('') }} className="btn btn-secondary">
                ← Volver
              </button>
              <button
                onClick={importar}
                disabled={camposFaltantes.length > 0}
                className="btn btn-primary"
              >
                Importar {rows.length} filas <ChevronRight size={14} />
              </button>
            </>
          )}
          {paso === PASOS.RESULTADO && (
            <>
              <button onClick={() => { setPaso(PASOS.UPLOAD); setResultado(null); setError(''); if (fileRef.current) fileRef.current.value = '' }} className="btn btn-secondary">
                Importar otro
              </button>
              <button onClick={onClose} className="btn btn-primary">Listo</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
