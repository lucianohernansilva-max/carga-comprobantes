import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, Lock, AlertCircle, Clock } from 'lucide-react'
import { verificarLogin, getBloqueadoHasta, getIntentosRestantes } from '../auth/auth.js'
import { useAuth } from '../auth/AuthContext.jsx'

function useCuentaRegresiva(bloqueadoHasta) {
  const [segs, setSegs] = useState(0)

  useEffect(() => {
    if (!bloqueadoHasta) { setSegs(0); return }
    const actualizar = () => {
      const restante = Math.max(0, Math.ceil((bloqueadoHasta.getTime() - Date.now()) / 1000))
      setSegs(restante)
    }
    actualizar()
    const id = setInterval(actualizar, 1000)
    return () => clearInterval(id)
  }, [bloqueadoHasta])

  if (!segs) return null
  const m = Math.floor(segs / 60)
  const s = segs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Login() {
  const { onLogin }   = useAuth()
  const [password, setPassword]     = useState('')
  const [show, setShow]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [bloqueadoHasta, setBloqueado] = useState(() => getBloqueadoHasta())
  const [intentosRestantes, setIntentos] = useState(() => getIntentosRestantes())
  const inputRef = useRef()
  const cuentaRegresiva = useCuentaRegresiva(bloqueadoHasta)

  useEffect(() => {
    if (!bloqueadoHasta) inputRef.current?.focus()
  }, [bloqueadoHasta])

  // Desbloquear automáticamente cuando expire el timer
  useEffect(() => {
    if (!bloqueadoHasta) return
    const ms = bloqueadoHasta.getTime() - Date.now()
    if (ms <= 0) { setBloqueado(null); return }
    const id = setTimeout(() => {
      setBloqueado(null)
      setError('')
      setIntentos(5)
    }, ms)
    return () => clearTimeout(id)
  }, [bloqueadoHasta])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || bloqueadoHasta) return
    setLoading(true)
    setError('')
    try {
      const res = await verificarLogin(password)
      if (res.ok) {
        onLogin()
      } else if (res.bloqueado) {
        setBloqueado(res.bloqueadoHasta)
        setError('Demasiados intentos fallidos. Cuenta bloqueada.')
      } else {
        setPassword('')
        const restantes = res.intentosRestantes ?? getIntentosRestantes()
        setIntentos(restantes)
        if (restantes === 0) {
          setBloqueado(getBloqueadoHasta())
          setError('Demasiados intentos fallidos. Cuenta bloqueada por 5 minutos.')
        } else {
          setError(`Contraseña incorrecta. ${restantes} intento${restantes !== 1 ? 's' : ''} restante${restantes !== 1 ? 's' : ''}.`)
        }
      }
    } catch {
      setError('Error interno. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">VencimientosFi</h1>
          <p className="text-sm text-gray-500 mt-1">Ingresá para acceder al sistema</p>
        </div>

        <div className="card-padded shadow-md">

          {/* Pantalla de bloqueo */}
          {bloqueadoHasta && cuentaRegresiva ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <Clock size={26} className="text-danger" />
              </div>
              <p className="font-bold text-gray-800">Cuenta bloqueada</p>
              <p className="text-sm text-gray-500">
                Demasiados intentos fallidos. Podés volver a intentar en:
              </p>
              <p className="text-3xl font-bold text-danger font-mono">{cuentaRegresiva}</p>
              <p className="text-xs text-gray-400">minutos : segundos</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label className="form-label">Usuario</label>
                <input
                  className="form-input bg-gray-50 text-gray-500"
                  value="admin"
                  readOnly
                />
              </div>

              <div>
                <label className="form-label">Contraseña</label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={show ? 'text' : 'password'}
                    className={`form-input pr-10 ${error ? 'error' : ''}`}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Ingresá tu contraseña"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-danger text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!error && intentosRestantes < 5 && intentosRestantes > 0 && (
                <p className="text-xs text-warning">
                  ⚠ {intentosRestantes} intento{intentosRestantes !== 1 ? 's' : ''} restante{intentosRestantes !== 1 ? 's' : ''} antes del bloqueo
                </p>
              )}

              <button
                type="submit"
                disabled={!password || loading}
                className="btn btn-primary w-full btn-lg"
              >
                {loading ? 'Verificando...' : 'Ingresar'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Acceso protegido — datos almacenados localmente
        </p>
      </div>
    </div>
  )
}
