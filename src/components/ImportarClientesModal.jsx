import { useState, useRef } from 'react'
import { X, Upload, Download, AlertTriangle, CheckCircle, SkipForward, FileSpreadsheet, RefreshCw } from 'lucide-react'
import { parsearExcelClientes, validarClientesImportados, descargarPlantilla } from '../db/importacion.js'
import { saveCliente, getClientes, saveObligacionCliente, getTiposObligacion } from '../db/store.js'
import { generarVencimientosCliente } from '../db/generador.js'

// Asigna automáticamente obligaciones predeterminadas según condición fiscal
const asignarObligacionesDefecto = (clienteId, condicionFiscal, tieneEmpleados) => {
  const todos = getTiposObligacion().filter(t => t.activo)
  const asignar = []

  for (const tipo of todos) {
    // Si el tipo tiene lista de condiciones aplicables, filtrar
    if (tipo.condicionesFiscales && !tipo.condicionesFiscales.includes(condicionFiscal)) continue
    // Si requiere empleados y el cliente no tiene, saltear
    if (tipo.requiereEmpleados && !tieneEmpleados) continue
    asignar.push(tipo)
  }

  for (const tipo of asignar) {
    saveObligacionCliente({
      clienteId,
      tipoObligacionId: tipo.id,
      activa:           true,
      configuracionExtra: {},
    })
  }
}

export default function ImportarClientesModal({ onClose, onImportado }) {
  const [paso, setPaso]           = useState('inicio')   // inicio | preview | resultado
  const [archivo, setArchivo]     = useState(null)
  const [candidatos, setCandidatos] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado]   = useState(null)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setArchivo(file)
    setProcesando(true)
    try {
      const parseados  = await parsearExcelClientes(file)
      const existentes = getClientes()
      const validados  = validarClientesImportados(parseados, existentes)
      setCandidatos(validados)
      setPaso('preview')
    } catch (err) {
      alert('Error al leer el archivo: ' + err.message)
    } finally {
      setProcesando(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const toggleImportar = (idx) => {
    setCandidatos(prev => prev.map((c, i) =>
      i === idx && c.errores.length === 0 && !c.duplicado
        ? { ...c, importar: !c.importar }
        : c
    ))
  }

  const ejecutarImportacion = async () => {
    setProcesando(true)
    const aImportar = candidatos.filter(c => c.importar)
    let importados = 0
    const errores  = []

    for (const candidato of aImportar) {
      try {
        const { _rowIndex, errores: _, duplicado, importar, ...datos } = candidato
        const lista    = saveCliente(datos)
        // El saveCliente retorna el array, buscamos el recién creado por CUIT
        const nuevo    = getClientes().find(c =>
          c.cuit.replace(/\D/g,'') === datos.cuit.replace(/\D/g,'')
        )
        if (nuevo) {
          asignarObligacionesDefecto(nuevo.id, nuevo.condicionFiscal, nuevo.tieneEmpleados)
          generarVencimientosCliente(nuevo, { horizonte: 12 })
          importados++
        }
      } catch (err) {
        errores.push(`Fila ${candidato._rowIndex}: ${err.message}`)
      }
    }

    setResultado({ importados, errores, total: aImportar.length })
    setPaso('resultado')
    setProcesando(false)
    onImportado?.()
  }

  const aImportar    = candidatos.filter(c => c.importar).length
  const conErrores   = candidatos.filter(c => c.errores.length > 0).length
  const duplicados   = candidatos.filter(c => c.duplicado).length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-primary" />
            <h2 className="text-base font-bold text-gray-900">Importar clientes desde Excel</h2>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm p-1.5">
            <X size={15} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── PASO 1: INICIO ── */}
          {paso === 'inicio' && (
            <div className="space-y-4">
              {/* Zona de drop */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="font-semibold text-gray-700">Arrastrá el archivo Excel acá</p>
                <p className="text-sm text-gray-400 mt-1">o hacé clic para seleccionarlo</p>
                <p className="text-xs text-gray-400 mt-2">Formatos: .xlsx, .xls</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>

              {procesando && (
                <div className="flex items-center justify-center gap-2 text-primary py-4">
                  <RefreshCw size={16} className="animate-spin" />
                  <span className="text-sm">Leyendo archivo...</span>
                </div>
              )}

              {/* Descarga de plantilla */}
              <div className="card-padded bg-blue-50 border-blue-200 flex items-start gap-3">
                <FileSpreadsheet size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">¿No tenés la planilla?</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Descargá la plantilla con las columnas correctas y completala con tus clientes.
                  </p>
                </div>
                <button onClick={descargarPlantilla} className="btn btn-primary btn-sm shrink-0">
                  <Download size={13} /> Plantilla
                </button>
              </div>

              {/* Referencia de columnas */}
              <details className="card-padded cursor-pointer">
                <summary className="text-sm font-semibold text-gray-700 select-none">
                  Ver columnas esperadas
                </summary>
                <div className="mt-3 space-y-1">
                  {['Nombre / Razón Social *', 'CUIT *', 'Condición Fiscal *',
                    'Categoría Monotributo', 'Categoría Autónomo', 'Tipo de Persona',
                    'Fecha Cierre Ejercicio (MM-DD)', 'Actividad Principal',
                    'Provincias IIBB (sep. por ;)', 'Liquida Anticipos Ganancias (SI/NO)',
                    'Tiene Empleados (SI/NO)', 'Cantidad Empleados', 'Notas'].map(col => (
                    <p key={col} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.includes('*') ? 'bg-danger' : 'bg-gray-300'}`} />
                      {col}
                    </p>
                  ))}
                  <p className="text-xs text-gray-400 mt-2">* Requerido</p>
                </div>
              </details>
            </div>
          )}

          {/* ── PASO 2: PREVIEW ── */}
          {paso === 'preview' && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card-padded text-center">
                  <p className="text-2xl font-bold text-success">{aImportar}</p>
                  <p className="text-xs text-gray-500">A importar</p>
                </div>
                <div className="card-padded text-center">
                  <p className="text-2xl font-bold text-warning">{duplicados}</p>
                  <p className="text-xs text-gray-500">Duplicados</p>
                </div>
                <div className="card-padded text-center">
                  <p className="text-2xl font-bold text-danger">{conErrores}</p>
                  <p className="text-xs text-gray-500">Con errores</p>
                </div>
              </div>

              {candidatos.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No se encontraron filas con datos en el archivo.</p>
                </div>
              )}

              {/* Tabla de preview */}
              {candidatos.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr className="text-gray-500 uppercase tracking-wide border-b border-gray-200">
                          <th className="px-3 py-2 text-left w-8">✓</th>
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-left">CUIT</th>
                          <th className="px-3 py-2 text-left">Condición</th>
                          <th className="px-3 py-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidatos.map((c, i) => (
                          <tr
                            key={i}
                            className={`border-b border-gray-100 ${
                              c.errores.length > 0 ? 'bg-red-50' :
                              c.duplicado        ? 'bg-yellow-50 opacity-70' :
                              c.importar         ? '' : 'opacity-50'
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={c.importar}
                                disabled={c.errores.length > 0 || c.duplicado}
                                onChange={() => toggleImportar(i)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-800 max-w-[160px] truncate">
                              {c.nombre || <span className="text-danger italic">sin nombre</span>}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{c.cuit || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{c.condicionFiscal}</td>
                            <td className="px-3 py-2">
                              {c.errores.length > 0 ? (
                                <span className="flex items-center gap-1 text-danger font-medium">
                                  <AlertTriangle size={11} />
                                  {c.errores.join(', ')}
                                </span>
                              ) : c.duplicado ? (
                                <span className="flex items-center gap-1 text-warning font-medium">
                                  <SkipForward size={11} />
                                  CUIT ya existe
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-success font-medium">
                                  <CheckCircle size={11} />
                                  Listo
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Se asignarán automáticamente las obligaciones predeterminadas según la condición fiscal de cada cliente, y se generarán los vencimientos de los próximos 12 meses.
              </p>
            </div>
          )}

          {/* ── PASO 3: RESULTADO ── */}
          {paso === 'resultado' && resultado && (
            <div className="space-y-4 text-center py-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                resultado.importados > 0 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <CheckCircle size={32} className={resultado.importados > 0 ? 'text-success' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">
                  {resultado.importados} cliente{resultado.importados !== 1 ? 's' : ''} importado{resultado.importados !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Con vencimientos generados para los próximos 12 meses.
                </p>
              </div>
              {resultado.errores.length > 0 && (
                <div className="text-left card-padded bg-red-50 border-red-200">
                  <p className="text-xs font-bold text-danger mb-1">Errores durante importación:</p>
                  {resultado.errores.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3">
          {paso === 'inicio' && (
            <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          )}

          {paso === 'preview' && (
            <>
              <button onClick={() => setPaso('inicio')} className="btn btn-secondary">← Volver</button>
              <button
                onClick={ejecutarImportacion}
                disabled={aImportar === 0 || procesando}
                className="btn btn-primary"
              >
                {procesando ? (
                  <><RefreshCw size={14} className="animate-spin" /> Importando...</>
                ) : (
                  <><Upload size={14} /> Importar {aImportar} cliente{aImportar !== 1 ? 's' : ''}</>
                )}
              </button>
            </>
          )}

          {paso === 'resultado' && (
            <button onClick={onClose} className="btn btn-primary">Listo</button>
          )}
        </div>
      </div>
    </div>
  )
}
