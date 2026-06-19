import { useState } from 'react'
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'
import { cambiarPassword } from '../auth/auth.js'

export default function CambiarPassword() {
  const [actual,  setActual]  = useState('')
  const [nueva,   setNueva]   = useState('')
  const [confirma,setConfirma]= useState('')
  const [showA,   setShowA]   = useState(false)
  const [showN,   setShowN]   = useState(false)
  const [showC,   setShowC]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState(null)  // { tipo: 'ok'|'error', texto }

  const requisitos = [
    { test: (p) => p.length >= 8,   label: 'Al menos 8 caracteres' },
    { test: (p) => /[A-Z]/.test(p), label: 'Al menos una mayúscula' },
    { test: (p) => /[0-9]/.test(p), label: 'Al menos un número' },
  ]
  const requisitosOk = requisitos.every(r => r.test(nueva))
  const coinciden    = nueva === confirma && confirma.length > 0
  const puedeGuardar = actual.length > 0 && requisitosOk && coinciden

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!puedeGuardar) return
    setLoading(true)
    setMsg(null)
    const res = await cambiarPassword(actual, nueva)
    setLoading(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente.' })
      setActual(''); setNueva(''); setConfirma('')
    } else {
      setMsg({ tipo: 'error', texto: res.error || 'Error al cambiar la contraseña.' })
    }
  }

  return (
    <div className="card-padded space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound size={15} className="text-primary" />
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Cambiar contraseña</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
        {/* Contraseña actual */}
        <div>
          <label className="form-label">Contraseña actual</label>
          <div className="relative">
            <input type={showA ? 'text' : 'password'} className="form-input pr-10"
              value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" />
            <button type="button" onClick={() => setShowA(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showA ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Nueva contraseña */}
        <div>
          <label className="form-label">Nueva contraseña</label>
          <div className="relative">
            <input type={showN ? 'text' : 'password'} className="form-input pr-10"
              value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShowN(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showN ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {nueva.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {requisitos.map(r => (
                <span key={r.label} className={`flex items-center gap-1 text-xs ${r.test(nueva) ? 'text-success' : 'text-gray-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${r.test(nueva) ? 'bg-success' : 'bg-gray-300'}`} />
                  {r.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Confirmar nueva */}
        <div>
          <label className="form-label">Confirmar nueva contraseña</label>
          <div className="relative">
            <input type={showC ? 'text' : 'password'}
              className={`form-input pr-10 ${confirma.length > 0 && !coinciden ? 'error' : ''}`}
              value={confirma} onChange={e => setConfirma(e.target.value)} autoComplete="new-password" />
            <button type="button" onClick={() => setShowC(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showC ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {confirma.length > 0 && !coinciden && (
            <p className="form-error">Las contraseñas no coinciden</p>
          )}
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            msg.tipo === 'ok'
              ? 'bg-green-50 text-success'
              : 'bg-red-50 text-danger'
          }`}>
            {msg.tipo === 'ok'
              ? <CheckCircle size={15} />
              : <AlertCircle size={15} />}
            {msg.texto}
          </div>
        )}

        <button type="submit" disabled={!puedeGuardar || loading} className="btn btn-primary btn-sm">
          {loading ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
