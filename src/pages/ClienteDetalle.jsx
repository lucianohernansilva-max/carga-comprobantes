import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil, RefreshCw, CalendarClock, FileCheck, Clock } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp } from '../context/AppContext.jsx'
import { generarVencimientosCliente } from '../db/generador.js'
import { getCliente, getInscripciones } from '../db/store.js'
import EstadoBadge from '../components/EstadoBadge.jsx'
import VencimientoRow from '../components/VencimientoRow.jsx'
import ChecklistMensual from '../components/ChecklistMensual.jsx'
import SemaforoFacturacion from '../components/SemaforoFacturacion.jsx'

const CONDICION_LABELS = {
  monotributista:     'Monotributista',
  responsable_inscripto: 'Responsable Inscripto',
  exento:             'Exento',
  autonomo:           'Autónomo',
}

export default function ClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { clientes, vencimientos, tipos, obligaciones, refresh } = useApp()
  const cliente = clientes.find(c => c.id === id)

  if (!cliente) return (
    <div className="p-5 text-gray-500">Cliente no encontrado. <button onClick={() => navigate('/clientes')} className="underline">Volver</button></div>
  )

  const oblsCliente  = obligaciones.filter(o => o.clienteId === id && o.activa)
  const inscCliente  = getInscripciones(id)
  const vencCliente  = vencimientos
    .filter(v => v.clienteId === id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const proximos = vencCliente.filter(v => {
    if (['pagado','presentado','no_aplica'].includes(v.estado)) return false
    return v.fecha >= new Date().toISOString().slice(0,10)
  }).slice(0, 15)

  const handleGenerar = () => {
    const c = getCliente(id)
    if (c) { generarVencimientosCliente(c); refresh() }
  }

  return (
    <div className="p-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/clientes')} className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
          <p className="text-sm text-gray-500">CUIT {cliente.cuit} · {CONDICION_LABELS[cliente.condicionFiscal]}</p>
        </div>
        <Link to={`/clientes/${id}/editar`} className="btn btn-outline btn-sm">
          <Pencil size={13} /> Editar
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Info */}
        <div className="card-padded space-y-2">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Datos</p>
          {[
            ['Tipo persona', cliente.tipoPersona === 'juridica' ? 'Jurídica' : 'Humana'],
            cliente.categoriaMonotributo && ['Cat. Monotributo', `Categoría ${cliente.categoriaMonotributo}`],
            cliente.categoriaAutonomo    && ['Cat. Autónomo',    `Categoría ${cliente.categoriaAutonomo}`],
            cliente.fechaCierreEjercicio && ['Cierre ejercicio', cliente.fechaCierreEjercicio],
            cliente.actividadPrincipal   && ['Actividad', cliente.actividadPrincipal],
            cliente.tieneEmpleados       && ['Empleados', `${cliente.cantidadEmpleados || '?'}`],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
          {(cliente.jurisdiccionesIIBB || []).length > 0 && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">IIBB</span>
              <div className="flex flex-wrap gap-1">
                {cliente.jurisdiccionesIIBB.map(j => (
                  <span key={j} className="badge bg-gray-100 text-gray-600 text-xs">{j}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Obligaciones */}
        <div className="card-padded">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-2">Obligaciones activas</p>
          <div className="space-y-1">
            {oblsCliente.length === 0 && <p className="text-xs text-gray-400">Sin obligaciones activas</p>}
            {oblsCliente.map(o => {
              const tipo = tipos.find(t => t.id === o.tipoObligacionId)
              return tipo ? (
                <p key={o.id} className="text-xs text-gray-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-success rounded-full shrink-0" />
                  {tipo.nombre}
                </p>
              ) : null
            })}
          </div>
        </div>
      </div>

      {cliente.notas && (
        <div className="card-padded mb-4 bg-yellow-50 border-yellow-200">
          <p className="text-xs text-gray-600 italic">{cliente.notas}</p>
        </div>
      )}

      {/* Vencimientos */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-gray-700">Próximos vencimientos</p>
        <button onClick={handleGenerar} className="btn btn-secondary btn-sm">
          <RefreshCw size={12} /> Regenerar
        </button>
      </div>

      {proximos.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <CalendarClock size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay vencimientos próximos</p>
        </div>
      ) : (
        proximos.map(v => <VencimientoRow key={v.id} v={v} onUpdate={refresh} />)
      )}

      {/* Semáforo de facturación — solo Monotributistas */}
      {cliente.condicionFiscal === 'monotributista' && (
        <div className="mt-5">
          <SemaforoFacturacion cliente={cliente} />
        </div>
      )}

      {/* Checklist mensual */}
      <div className="mt-5">
        <ChecklistMensual clienteId={id} condicionFiscal={cliente.condicionFiscal} />
      </div>

      {/* Inscripciones y certificados */}
      {inscCliente.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">Inscripciones y certificados</p>
            <Link to="/inscripciones" className="text-xs text-primary underline">Ver todos</Link>
          </div>
          <div className="space-y-1.5">
            {inscCliente.map(item => {
              const dias = item.fechaVencimiento ? differenceInDays(parseISO(item.fechaVencimiento), new Date()) : null
              const urgente = dias !== null && dias <= (item.diasRecordatorio || 30)
              return (
                <div key={item.id} className={`rounded-lg border px-3 py-2.5 flex items-center gap-3 ${urgente ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileCheck size={11} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                    {item.organismo && <p className="text-xs text-gray-400">{item.organismo}</p>}
                  </div>
                  {item.fechaVencimiento && (
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-700">{format(parseISO(item.fechaVencimiento), 'dd/MM/yy', { locale: es })}</p>
                      {dias !== null && dias >= 0 && dias <= 60 && (
                        <p className={`text-xs ${dias <= 7 ? 'text-red-600 font-bold' : 'text-orange-600'}`}>{dias}d</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
