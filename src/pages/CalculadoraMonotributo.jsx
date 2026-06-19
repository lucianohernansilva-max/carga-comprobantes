import { useState, useMemo } from 'react'
import { Calculator, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

// Límites de facturación anual por categoría (valores aproximados 2025, actualizables en UI)
// Fuente: AFIP — se actualizan periódicamente
const CATEGORIAS_DEFAULT = [
  { cat: 'A', servicios: 6_450_000,   ventas: 9_250_000 },
  { cat: 'B', servicios: 9_650_000,   ventas: 13_750_000 },
  { cat: 'C', servicios: 13_600_000,  ventas: 19_250_000 },
  { cat: 'D', servicios: 19_250_000,  ventas: 27_250_000 },
  { cat: 'E', servicios: 24_500_000,  ventas: 34_750_000 },
  { cat: 'F', servicios: 29_100_000,  ventas: 41_000_000 },
  { cat: 'G', servicios: 33_900_000,  ventas: 47_750_000 },
  { cat: 'H', servicios: 50_900_000,  ventas: 71_900_000 },
  { cat: 'I', servicios: 60_900_000,  ventas: 85_900_000 },
  { cat: 'J', servicios: 73_100_000,  ventas: 103_100_000 },
  { cat: 'K', servicios: 87_750_000,  ventas: 123_750_000 },
]

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
const fmtNum = (n) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)

const STORAGE_KEY = 'vc_cat_mono_limites'
const loadCategorias = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || CATEGORIAS_DEFAULT } catch { return CATEGORIAS_DEFAULT }
}
const saveCategorias = (c) => localStorage.setItem(STORAGE_KEY, JSON.stringify(c))

function Semaforo({ pct }) {
  const color = pct >= 95 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-success'
  const label = pct >= 95 ? 'Debe recategorizar' : pct >= 80 ? 'Próximo al límite' : 'Dentro del límite'
  const Icon  = pct >= 95 ? XCircle : pct >= 80 ? AlertTriangle : CheckCircle

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl ${
      pct >= 95 ? 'bg-red-50 border border-danger/30' :
      pct >= 80 ? 'bg-orange-50 border border-warning/30' :
                  'bg-green-50 border border-success/30'
    }`}>
      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className={`font-bold text-sm ${pct >= 95 ? 'text-danger' : pct >= 80 ? 'text-warning' : 'text-success'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-600 mt-0.5">
          Utilizó el <strong>{pct.toFixed(1)}%</strong> del límite de su categoría
        </p>
      </div>
    </div>
  )
}

export default function CalculadoraMonotributo() {
  const [categorias, setCategorias] = useState(loadCategorias)
  const [actividad, setActividad]   = useState('servicios')
  const [catActual, setCatActual]   = useState('D')
  const [meses, setMeses]           = useState([...Array(12)].map(() => ''))
  const [editLimites, setEditLimites] = useState(false)

  const facturacionTotal = useMemo(() =>
    meses.reduce((sum, v) => sum + (parseFloat(v.replace(/\./g,'').replace(',','.')) || 0), 0)
  , [meses])

  const setMes = (i, val) => {
    const num = val.replace(/[^0-9,]/g, '')
    setMeses(prev => { const a = [...prev]; a[i] = num; return a })
  }

  const catIndex    = categorias.findIndex(c => c.cat === catActual)
  const limite      = categorias[catIndex]?.[actividad] || 0
  const pct         = limite > 0 ? Math.min((facturacionTotal / limite) * 100, 150) : 0

  // Categoría sugerida según facturación
  const catSugerida = useMemo(() => {
    const limite = actividad === 'servicios' ? 'servicios' : 'ventas'
    const match  = [...categorias].find(c => c[limite] >= facturacionTotal)
    return match?.cat || 'RI'  // supera categoría K → Responsable Inscripto
  }, [facturacionTotal, actividad, categorias])

  const MESES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  const resetMeses = () => setMeses([...Array(12)].map(() => ''))

  return (
    <div className="p-5 max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Calculator size={20} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calculadora Monotributo</h1>
          <p className="text-sm text-gray-500">Verificá la categoría según facturación de los últimos 12 meses</p>
        </div>
      </div>

      {/* Configuración */}
      <div className="card-padded space-y-3">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Parámetros</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">Tipo de actividad</label>
            <select className="form-select" value={actividad} onChange={e => setActividad(e.target.value)}>
              <option value="servicios">Prestación de servicios</option>
              <option value="ventas">Venta de bienes</option>
            </select>
          </div>
          <div>
            <label className="form-label">Categoría actual</label>
            <select className="form-select" value={catActual} onChange={e => setCatActual(e.target.value)}>
              {categorias.map(c => <option key={c.cat} value={c.cat}>Categoría {c.cat} — {fmt(c[actividad])}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Ingreso por mes */}
      <div className="card-padded space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Facturación mensual</p>
          <button onClick={resetMeses} className="btn btn-secondary btn-sm">
            <RefreshCw size={12} /> Limpiar
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {MESES_LABELS.map((m, i) => (
            <div key={m}>
              <label className="form-label text-xs">{m}</label>
              <input
                className="form-input text-sm"
                inputMode="numeric"
                placeholder="0"
                value={meses[i]}
                onChange={e => setMes(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <div className="card-padded space-y-4">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Resultado</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{fmt(facturacionTotal)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Facturación acumulada</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-2xl font-bold text-gray-900">{fmt(limite)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Límite Cat. {catActual}</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>0%</span>
            <span className="font-semibold">{pct.toFixed(1)}%</span>
            <span>100%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
            <div
              className="h-4 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(pct, 100)}%`,
                background: pct >= 95 ? '#C0392B' : pct >= 80 ? '#E67E22' : '#27AE60',
              }}
            />
            {/* Marcas */}
            {[80, 95].map(m => (
              <div key={m} className="absolute top-0 h-full w-0.5 bg-white/70"
                   style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="flex justify-between text-xs mt-0.5 text-gray-400">
            <span></span>
            <span style={{ marginLeft: '75%' }}>80%</span>
            <span>95%</span>
          </div>
        </div>

        <Semaforo pct={pct} />

        {catSugerida !== catActual && (
          <div className={`p-3 rounded-xl border text-sm font-medium ${
            catSugerida === 'RI'
              ? 'bg-red-50 border-danger/30 text-danger'
              : 'bg-blue-50 border-primary/30 text-primary'
          }`}>
            {catSugerida === 'RI'
              ? '⚠ La facturación supera el límite de la Categoría K. Debe inscribirse como Responsable Inscripto.'
              : `💡 La categoría correcta según la facturación sería: Categoría ${catSugerida}`}
          </div>
        )}
      </div>

      {/* Tabla de límites */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Tabla de límites {new Date().getFullYear()}</p>
          <button onClick={() => setEditLimites(e => !e)} className="btn btn-secondary btn-sm">
            {editLimites ? 'Listo' : 'Editar valores'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="py-2 text-left">Cat.</th>
                <th className="py-2 text-right">Servicios</th>
                <th className="py-2 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((c, i) => (
                <tr key={c.cat} className={`border-b border-gray-100 ${c.cat === catActual ? 'bg-primary/5 font-semibold' : ''}`}>
                  <td className="py-1.5 text-gray-700">Cat. {c.cat}</td>
                  <td className="py-1.5 text-right text-gray-600">
                    {editLimites
                      ? <input type="number" className="form-input text-xs py-0.5 w-32 text-right"
                          value={c.servicios}
                          onChange={e => {
                            const nc = [...categorias]; nc[i] = { ...nc[i], servicios: Number(e.target.value) }
                            setCategorias(nc); saveCategorias(nc)
                          }} />
                      : fmtNum(c.servicios)}
                  </td>
                  <td className="py-1.5 text-right text-gray-600">
                    {editLimites
                      ? <input type="number" className="form-input text-xs py-0.5 w-32 text-right"
                          value={c.ventas}
                          onChange={e => {
                            const nc = [...categorias]; nc[i] = { ...nc[i], ventas: Number(e.target.value) }
                            setCategorias(nc); saveCategorias(nc)
                          }} />
                      : fmtNum(c.ventas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">Valores en ARS. Actualizalos cuando AFIP publique nuevas tablas.</p>
      </div>
    </div>
  )
}
