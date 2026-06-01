import { useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp } from '../context/AppContext.jsx'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const ESTADO_COLORS = {
  pendiente:  '#FBBF24',
  en_proceso: '#3B82F6',
  presentado: '#A855F7',
  pagado:     '#27AE60',
  no_aplica:  '#9CA3AF',
  vencido:    '#C0392B',
}
const ESTADO_LABELS = {
  pendiente: 'Pendiente', en_proceso: 'En proceso', presentado: 'Presentado',
  pagado: 'Pagado', no_aplica: 'No aplica', vencido: 'Vencido',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      {label && <p className="font-bold text-gray-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function Estadisticas() {
  const { vencimientos, clientes } = useApp()

  // ── 1. Distribución por estado (pie) ─────────────────────────────────────
  const porEstado = useMemo(() => {
    const counts = {}
    for (const v of vencimientos) {
      counts[v.estado] = (counts[v.estado] || 0) + 1
    }
    return Object.entries(counts)
      .map(([estado, value]) => ({ name: ESTADO_LABELS[estado] || estado, value, estado }))
      .sort((a, b) => b.value - a.value)
  }, [vencimientos])

  // ── 2. Vencimientos por mes (bar, últimos 6 meses) ────────────────────────
  const porMes = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d   = subMonths(now, 5 - i)
      const key = format(d, 'yyyy-MM')
      const mes  = MESES_CORTOS[d.getMonth()]
      const vencsDelMes = vencimientos.filter(v => v.fecha?.startsWith(key))
      return {
        mes: `${mes} ${d.getFullYear()}`,
        Total:     vencsDelMes.length,
        Pagados:   vencsDelMes.filter(v => ['pagado','presentado'].includes(v.estado)).length,
        Pendientes:vencsDelMes.filter(v => v.estado === 'pendiente').length,
        Vencidos:  vencsDelMes.filter(v => v.estado === 'vencido').length,
      }
    })
  }, [vencimientos])

  // ── 3. Top clientes por vencimientos pendientes ───────────────────────────
  const topClientes = useMemo(() => {
    const counts = {}
    for (const v of vencimientos) {
      if (v.estado === 'pendiente') {
        const nombre = v.cliente?.nombre || 'Desconocido'
        counts[nombre] = (counts[nombre] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([cliente, pendientes]) => ({ cliente, pendientes }))
      .sort((a, b) => b.pendientes - a.pendientes)
      .slice(0, 8)
  }, [vencimientos])

  // ── 4. Métricas de resumen ────────────────────────────────────────────────
  const hoy = new Date().toISOString().slice(0,10)
  const completados = vencimientos.filter(v => ['pagado','presentado'].includes(v.estado)).length
  const total       = vencimientos.length
  const tasaExito   = total > 0 ? Math.round((completados / total) * 100) : 0
  const vencidos    = vencimientos.filter(v => v.estado === 'vencido').length
  const proximos7   = vencimientos.filter(v => {
    if (!['pendiente','en_proceso'].includes(v.estado)) return false
    const d = Math.ceil((new Date(v.fecha) - new Date()) / 86400000)
    return d >= 0 && d <= 7
  }).length

  return (
    <div className="p-5 max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-gray-500">Resumen general de la cartera</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total registrados',  value: total,      color: 'text-primary' },
          { label: 'Completados',        value: completados, color: 'text-success' },
          { label: 'Vencidos sin acción',value: vencidos,   color: 'text-danger' },
          { label: 'Próximos 7 días',    value: proximos7,  color: 'text-warning' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-padded text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Tasa de cumplimiento */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">Tasa de cumplimiento global</p>
          <p className="text-2xl font-bold text-success">{tasaExito}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${tasaExito}%`,
              background: tasaExito >= 80 ? '#27AE60' : tasaExito >= 60 ? '#E67E22' : '#C0392B',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{completados} de {total} vencimientos completados</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pie por estado */}
        <div className="card-padded">
          <p className="text-sm font-bold text-gray-700 mb-4">Distribución por estado</p>
          {porEstado.length === 0
            ? <p className="text-center text-gray-400 py-8 text-sm">Sin datos</p>
            : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porEstado} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                     dataKey="value" paddingAngle={2}>
                  {porEstado.map((entry) => (
                    <Cell key={entry.estado} fill={ESTADO_COLORS[entry.estado] || '#9CA3AF'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top clientes pendientes */}
        <div className="card-padded">
          <p className="text-sm font-bold text-gray-700 mb-4">Clientes con más vencimientos pendientes</p>
          {topClientes.length === 0
            ? <p className="text-center text-gray-400 py-8 text-sm">Sin pendientes 🎉</p>
            : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topClientes} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="cliente" tick={{ fontSize: 10 }} width={100}
                       tickFormatter={v => v.length > 14 ? v.slice(0,13)+'…' : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pendientes" name="Pendientes" fill="#1e3a5f" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bar por mes */}
      <div className="card-padded">
        <p className="text-sm font-bold text-gray-700 mb-4">Evolución últimos 6 meses</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={porMes} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            <Bar dataKey="Pagados"    fill="#27AE60" stackId="a" radius={[0,0,0,0]} />
            <Bar dataKey="Pendientes" fill="#FBBF24" stackId="a" />
            <Bar dataKey="Vencidos"   fill="#C0392B" stackId="a" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
