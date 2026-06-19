// Pantalla de configuración inicial de contraseña (primera vez que se abre la app)
import { useState } from 'react'
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { configurarPassword } from '../auth/auth.js'
import { useAuth } from '../auth/AuthContext.jsx'

const requisitos = [
  { test: (p) => p.length >= 8,              label: 'Al menos 8 caracteres' },
  { test: (p) => /[A-Z]/.test(p),            label: 'Al menos una mayúscula' },
  { test: (p) => /[0-9]/.test(p),            label: 'Al menos un número' },
]

function RequisitoBadge({ ok, label }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs ${ok ? 'text-success' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-gray-300'}`} />
      {label}
    </span>
  )
}

export default function SetupPassword() {
  const { onLogin } = useAuth()
  const [pass1, setPass1]       = useState('')
  const [pass2, setPass2]       = useState('')
  const [show1, setShow1]       = useState(false)
  const [show2, setShow2]       = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState('')

  const requisitosOk = requisitos.every(r => r.test(pass1))
  const coinciden    = pass1 === pass2 && pass2.length > 0
  const puedeGuardar = requisitosOk && coinciden

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    setLoading(true)
    setError('')
    try {
      await configurarPassword(pass1)
      onLogin()
    } catch {
      setError('Error al guardar la contraseña. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido a VencimientosFi</h1>
          <p className="text-sm text-gray-500 mt-1">Configurá tu contraseña de acceso para proteger los datos de tus clientes.</p>
        </div>

        <div className="card-padded shadow-md">
          <p className="text-xs font-bold text-primary uppercase tracking-wide mb-4">Configurar contraseña — usuario: <span className="normal-case font-mono">admin</span></p>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Contraseña nueva */}
            <div>
              <label className="form-label">Contraseña <span className="text-danger">*</span></label>
              <div className="relative">
                <input
                  type={show1 ? 'text' : 'password'}
                  className="form-input pr-10"
                  value={pass1}
                  onChange={e => setPass1(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow1(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show1 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Indicadores de requisitos */}
              {pass1.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {requisitos.map(r => (
                    <RequisitoBadge key={r.label} ok={r.test(pass1)} label={r.label} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirmar */}
            <div>
              <label className="form-label">Confirmar contraseña <span className="text-danger">*</span></label>
              <div className="relative">
                <input
                  type={show2 ? 'text' : 'password'}
                  className={`form-input pr-10 ${pass2.length > 0 && !coinciden ? 'error' : ''}`}
                  value={pass2}
                  onChange={e => setPass2(e.target.value)}
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShow2(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pass2.length > 0 && !coinciden && (
                <p className="form-error">Las contraseñas no coinciden</p>
              )}
              {coinciden && (
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full" /> Las contraseñas coinciden
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-danger text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!puedeGuardar || loading}
              className="btn btn-primary w-full btn-lg"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña y entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          La contraseña se guarda hasheada localmente. Nunca se envía a ningún servidor.
        </p>
      </div>
    </div>
  )
}
