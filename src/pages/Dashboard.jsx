import { useState, useMemo } from 'react'
import { differenceInDays, parseISO, format, startOfMonth, endOfMonth, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Clock, CalendarDays, TrendingUp, FileCheck } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { saveVencimiento, getFacturacionMono, LIMITES_MONOTRIBUTO_DEFAULT } from '../db/store.js'
import PagoModal from '../components/PagoModal.jsx'

const HORIZONTES = [
  { label: '30 días', days: 30 },
  { label: '60 días', days: 60 },
  { label: '90 días', days: 90 },
]

function urgencyStyle(estado, fecha) {
  if (['pagado','presentado','no_aplica'].includes(estado))
    return 'bg-gray-50 border-l-4 border-gray-200 opacity-60'
  const hoy = new Date().toISOString().slice(0, 10)
  if (fecha < hoy) return 'bg-red-50 border-l-4 border-red-500'
  const dias = differenceInDays(parseISO(fecha), new Date())
  if (dias === 0)  return 'bg-red-50 border-l-4 border-red-500'
  if (dias <= 3)   return 'bg-orange-50 border-l-4 border-orange-400'
  if (dias <= 7)   return 'bg-yellow-50 border-l-4 border-yellow-400'
  return 'bg-white border-l-4 border-transparent'
}

function DiasChip({ estado, fecha }) {
  const hoy = new Date().toISOString().slice(0, 10)
  if (['pagado','presentado','no_aplica'].includes(estado))
    return <span className="text-gray-400 text-xs">—</span>
  if (fecha < hoy) {
    const d = differenceInDays(new Date(), parseISO(fecha))
    return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">+{d}d</span>
  }
  const dias = differenceInDays(parseISO(fecha), new Date())
  if (dias === 0) return <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Hoy</span>
  if (dias === 1) return <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Mañana</span>
  if (dias <= 7)  return <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">{dias}d</span>
  return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{dias}d</span>
}

function EstadoInline({ estado }) {
  const styles = {
    pendiente:  'text-yellow-700 bg-yellow-50 border border-yellow-200',
    en_proceso: 'text-blue-700 bg-blue-50 border border-blue-200',
    presentado: 'text-green-700 bg-green-50 border border-green-200',
    pagado:     'text-emerald-700 bg-emerald-50 border border-emerald-200',
    no_aplica:  'text-gray-500 bg-gray-100 border border-gray-200',
    vencido:    'text-red-700 bg-red-50 border border-red-200',
  }
  const labels = {
    pendiente: 'Pendiente', en_proceso: 'En proceso', presentado: 'Presentado',
    pagado: 'Pagado', no_aplica: 'N/A', vencido: 'Vencido',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[estado] || styles.pendiente}`}>
      {labels[estado] || estado}
    </span>
  )
}

function VencimientoTableRow({ v, onUpdate }) {
  const completado = ['pagado','presentado','no_aplica'].includes(v.estado)
  const [pagoModal, setPagoModal] = useState(false)

  const cambiar = (estado) => {
    if (estado === 'pagado') { setPagoModal(true); return }
    saveVencimiento({ ...v, estado })
    onUpdate?.()
  }

  return (
    <>
    {pagoModal && <PagoModal v={v} onClose={() => setPagoModal(false)} onSave={onUpdate} />}
    <tr className={`transition-colors ${urgencyStyle(v.estado, v.fecha)} border-b border-gray-100`}>
      {/* Fecha */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <p className="text-sm font-bold text-gray-800">
          {format(parseISO(v.fecha), 'dd/MM', { locale: es })}
        </p>
        <p className="text-xs text-gray-400">{format(parseISO(v.fecha), 'EEE', { locale: es })}</p>
      </td>

      {/* Días */}
      <td className="px-2 py-2.5 text-center whitespace-nowrap">
        <DiasChip estado={v.estado} fecha={v.fecha} />
      </td>

      {/* Cliente */}
      <td className="px-3 py-2.5 max-w-[140px]">
        <p className="text-sm text-gray-900 font-medium truncate">{v.cliente?.nombre}</p>
        {v.tentativo && (
          <p className="text-xs text-amber-600">⚠ tentativo</p>
        )}
      </td>

      {/* Obligación */}
      <td className="px-3 py-2.5 max-w-[160px]">
        <p className="text-sm text-gray-700 truncate">{v.tipo?.nombre}</p>
        <p className="text-xs text-gray-400">{v.periodo}</p>
      </td>

      {/* Estado actual */}
      <td className="px-2 py-2.5 text-center">
        <EstadoInline estado={v.estado} />
      </td>

      {/* Acciones inline */}
      <td className="px-2 py-2.5 whitespace-nowrap">
        {completado ? (
          <button
            onClick={() => cambiar('pendiente')}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Deshacer
          </button>
        ) : (
          <div className="flex gap-1">
            <button
              onClick={() => cambiar('presentado')}
              className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              Presentado
            </button>
            <button
              onClick={() => cambiar('pagado')}
              className="text-xs font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
            >
              Pagado
            </button>
            <button
              onClick={() => cambiar('no_aplica')}
              className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              N/A
            </button>
          </div>
        )}
      </td>
    </tr>
    </>
  )
}

export default function Dashboard() {
  const { vencimientos, clientes, config, inscripciones, refresh } = useApp()
  const [horizonte, setHorizonte]  = useState(30)
  const [filtroCliente, setFiltro] = useState('')
  const [filtroEstado, setFiltroE] = useState('')

  const hoy    = new Date().toISOString().slice(0, 10)
  const hasta  = addDays(new Date(), horizonte).toISOString().slice(0, 10)
  const manana = addDays(new Date(), 1).toISOString().slice(0, 10)
  const en7    = addDays(new Date(), 7).toISOString().slice(0, 10)
  const inicioMes = startOfMonth(new Date()).toISOString().slice(0, 10)
  const finMes    = endOfMonth(new Date()).toISOString().slice(0, 10)

  // Vencidos sin completar
  const vencidos = vencimientos.filter(v =>
    v.fecha < hoy && !['pagado','presentado','no_aplica'].includes(v.estado)
  )

  // Stats
  const hoyCount  = vencimientos.filter(v =>
    v.fecha === hoy && !['pagado','presentado','no_aplica'].includes(v.estado)
  ).length

  const semanaCount = vencimientos.filter(v =>
    v.fecha > hoy && v.fecha <= en7 && !['pagado','presentado','no_aplica'].includes(v.estado)
  ).length

  const pendientesTotal = vencimientos.filter(v =>
    !['pagado','presentado','no_aplica'].includes(v.estado)
  ).length

  const completadosMes = vencimientos.filter(v =>
    ['pagado','presentado'].includes(v.estado) && v.fecha >= inicioMes && v.fecha <= finMes
  ).length

  // Lista próximos con filtros
  const proximos = useMemo(() => {
    return vencimientos
      .filter(v => v.fecha >= hoy && v.fecha <= hasta)
      .filter(v => !filtroCliente || v.clienteId === filtroCliente)
      .filter(v => !filtroEstado  || v.estado === filtroEstado)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vencimientos, hoy, hasta, filtroCliente, filtroEstado])

  // Semáforo monotributo — clientes que superaron el 80%
  const alertasSemaforo = useMemo(() => clientes
    .filter(c => c.condicionFiscal === 'monotributista' && c.categoriaMonotributo)
    .map(c => {
      const limite = LIMITES_MONOTRIBUTO_DEFAULT[c.categoriaMonotributo]
      if (!limite) return null
      const anio = new Date().getFullYear()
      const fact = getFacturacionMono(c.id)
      const acumulado = Array.from({ length: 12 }, (_, i) => {
        const k = `${anio}-${String(i + 1).padStart(2, '0')}`
        return fact[k] || 0
      }).reduce((a, b) => a + b, 0)
      const pct = (acumulado / limite) * 100
      return pct >= 80 ? { cliente: c, pct: Math.round(pct), acumulado, limite } : null
    })
    .filter(Boolean)
    .sort((a, b) => b.pct - a.pct)
  , [clientes])

  // Inscripciones próximas a vencer
  const inscripcionesProximas = useMemo(() => inscripciones
    .filter(i => {
      if (!i.fechaVencimiento || i.estado === 'no_aplica') return false
      const dias = differenceInDays(parseISO(i.fechaVencimiento), new Date())
      return dias >= 0 && dias <= (i.diasRecordatorio || 30)
    })
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
  , [inscripciones])

  const nombreEstudio = config?.estudio?.nombre || 'Estudio Contable'

  return (
    <div className="min-h-full bg-gray-50">
      {/* ─── Header del estudio ──────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Logo" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-lg font-bold text-primary leading-tight">{nombreEstudio}</h1>
              <p className="text-xs text-gray-400 leading-tight">Sistema de Gestión Impositiva</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700 capitalize">
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </p>
            <p className="text-xs text-gray-400">{format(new Date(), 'yyyy')}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-6xl mx-auto space-y-5">

        {/* ─── Banner vencidos sin acción ──────────────────────── */}
        {vencidos.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-700">
                  {vencidos.length} obligación{vencidos.length !== 1 ? 'es' : ''} vencida{vencidos.length !== 1 ? 's' : ''} sin completar
                </p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  {vencidos.slice(0, 5).map(v => (
                    <span key={v.id} className="text-xs text-red-600">
                      {v.tipo?.nombre} — {v.cliente?.nombre}
                    </span>
                  ))}
                  {vencidos.length > 5 && (
                    <span className="text-xs text-red-400">y {vencidos.length - 5} más…</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Alertas semáforo monotributo ─────────────────────── */}
        {alertasSemaforo.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="text-amber-500 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-700 mb-1.5">
                  {alertasSemaforo.length} cliente{alertasSemaforo.length !== 1 ? 's' : ''} con facturación Monotributo en zona de alerta
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {alertasSemaforo.map(({ cliente, pct }) => (
                    <span key={cliente.id} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 95 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cliente.nombre} — {pct}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Cards de resumen ─────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <div className={`rounded-xl p-4 border ${hoyCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hoyCount > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <CalendarDays size={18} className={hoyCount > 0 ? 'text-red-600' : 'text-gray-400'} />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${hoyCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>{hoyCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Vencen hoy</p>
              </div>
            </div>
          </div>

          <div className={`rounded-xl p-4 border ${semanaCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${semanaCount > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <Clock size={18} className={semanaCount > 0 ? 'text-orange-500' : 'text-gray-400'} />
              </div>
              <div>
                <p className={`text-2xl font-black leading-none ${semanaCount > 0 ? 'text-orange-500' : 'text-gray-700'}`}>{semanaCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Esta semana</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-800 leading-none">{pendientesTotal}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-green-600 leading-none">{completadosMes}</p>
                <p className="text-xs text-gray-500 mt-0.5">Completados (mes)</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filtros ──────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizonte */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            {HORIZONTES.map(h => (
              <button
                key={h.days}
                onClick={() => setHorizonte(h.days)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  horizonte === h.days ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>

          <select
            className="form-select text-xs py-1.5 w-auto shadow-sm"
            value={filtroCliente}
            onChange={e => setFiltro(e.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>

          <select
            className="form-select text-xs py-1.5 w-auto shadow-sm"
            value={filtroEstado}
            onChange={e => setFiltroE(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="presentado">Presentado</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
          </select>

          <span className="text-xs text-gray-400 ml-auto">
            {proximos.length} vencimiento{proximos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ─── Tabla de vencimientos próximos ───────────────────── */}
        {proximos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-14 text-center">
            <CheckCircle size={40} className="mx-auto mb-3 text-green-400" />
            <p className="font-semibold text-gray-600">Sin vencimientos en este período</p>
            <p className="text-xs text-gray-400 mt-1">Todos los compromisos están al día</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Próximos {horizonte} días
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Fecha</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase">Días</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Obligación</th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-400 uppercase">Estado</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Acción rápida</th>
                  </tr>
                </thead>
                <tbody>
                  {proximos.map(v => (
                    <VencimientoTableRow key={v.id} v={v} onUpdate={refresh} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* ─── Inscripciones próximas ───────────────────────────── */}
        {inscripcionesProximas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={14} className="text-primary" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inscripciones y certificados próximos</p>
              </div>
              <span className="text-xs text-gray-400">{inscripcionesProximas.length} registro{inscripcionesProximas.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {inscripcionesProximas.map(item => {
                const cliente = clientes.find(c => c.id === item.clienteId)
                const dias = differenceInDays(parseISO(item.fechaVencimiento), new Date())
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-16 text-center shrink-0">
                      <p className="text-sm font-bold text-gray-800">{format(parseISO(item.fechaVencimiento), 'dd/MM', { locale: es })}</p>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${dias <= 7 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{dias}d</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{cliente?.nombre}{item.organismo && ` · ${item.organismo}`}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
