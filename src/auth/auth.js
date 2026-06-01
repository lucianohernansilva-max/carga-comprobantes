// Módulo de autenticación local.
// Usa Web Crypto API (SHA-256) — sin dependencias externas.
// La contraseña NUNCA se guarda en texto plano.

const KEYS = {
  hash:        'vc_auth_hash',       // hash SHA-256 de la contraseña
  lockUntil:   'vc_auth_lock_until', // timestamp ISO de fin de bloqueo
  failCount:   'vc_auth_fail_count', // intentos fallidos consecutivos
  session:     'vc_auth_session',    // sessionStorage: token de sesión activa
}

const MAX_INTENTOS   = 5
const BLOQUEO_MS     = 5 * 60 * 1000   // 5 minutos
const SESSION_TOKEN  = 'authenticated'  // valor simple; lo que importa es que sessionStorage se limpia al cerrar el tab

// ─── Hashing ─────────────────────────────────────────────────────────────────

// Prefijo fijo para evitar ataques de diccionario simples sobre localStorage
const SALT = 'vencimientosfi_v1__'

export const hashPassword = async (password) => {
  const encoder = new TextEncoder()
  const data     = encoder.encode(SALT + password)
  const buf      = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Estado del sistema ───────────────────────────────────────────────────────

export const tienePasswordConfigurada = () => {
  return !!localStorage.getItem(KEYS.hash)
}

// ─── Bloqueo ─────────────────────────────────────────────────────────────────

export const getBloqueadoHasta = () => {
  const val = localStorage.getItem(KEYS.lockUntil)
  if (!val) return null
  const ts = new Date(val).getTime()
  if (ts <= Date.now()) {
    // Ya expiró el bloqueo, limpiar
    localStorage.removeItem(KEYS.lockUntil)
    localStorage.removeItem(KEYS.failCount)
    return null
  }
  return new Date(val)
}

export const getIntentosRestantes = () => {
  const fails = parseInt(localStorage.getItem(KEYS.failCount) || '0', 10)
  return Math.max(0, MAX_INTENTOS - fails)
}

const registrarFallo = () => {
  const prev = parseInt(localStorage.getItem(KEYS.failCount) || '0', 10)
  const next = prev + 1
  localStorage.setItem(KEYS.failCount, String(next))
  if (next >= MAX_INTENTOS) {
    const hasta = new Date(Date.now() + BLOQUEO_MS).toISOString()
    localStorage.setItem(KEYS.lockUntil, hasta)
  }
}

const limpiarFallos = () => {
  localStorage.removeItem(KEYS.failCount)
  localStorage.removeItem(KEYS.lockUntil)
}

// ─── Sesión ───────────────────────────────────────────────────────────────────
// sessionStorage se limpia automáticamente al cerrar la pestaña/ventana.
// Cualquier nueva sesión de navegador requerirá login.

export const isSesionActiva = () => {
  return sessionStorage.getItem(KEYS.session) === SESSION_TOKEN
}

const abrirSesion  = () => sessionStorage.setItem(KEYS.session, SESSION_TOKEN)
export const cerrarSesion = () => sessionStorage.removeItem(KEYS.session)

// ─── Operaciones principales ─────────────────────────────────────────────────

// Configura la contraseña por primera vez (o la reemplaza)
export const configurarPassword = async (password) => {
  const hash = await hashPassword(password)
  localStorage.setItem(KEYS.hash, hash)
  limpiarFallos()
  abrirSesion()
}

// Retorna { ok, bloqueado, bloqueadoHasta, intentosRestantes }
export const verificarLogin = async (password) => {
  const bloqueadoHasta = getBloqueadoHasta()
  if (bloqueadoHasta) {
    return { ok: false, bloqueado: true, bloqueadoHasta }
  }

  const storedHash = localStorage.getItem(KEYS.hash)
  if (!storedHash) return { ok: false, sinPassword: true }

  const hash = await hashPassword(password)
  if (hash === storedHash) {
    limpiarFallos()
    abrirSesion()
    return { ok: true }
  }

  registrarFallo()
  const bloqueadoDespues = getBloqueadoHasta()
  return {
    ok:                false,
    bloqueado:         !!bloqueadoDespues,
    bloqueadoHasta:    bloqueadoDespues,
    intentosRestantes: getIntentosRestantes(),
  }
}

// Cambia la contraseña verificando la actual primero
export const cambiarPassword = async (actual, nueva) => {
  const storedHash = localStorage.getItem(KEYS.hash)
  if (!storedHash) return { ok: false, error: 'No hay contraseña configurada' }
  const hashActual = await hashPassword(actual)
  if (hashActual !== storedHash) return { ok: false, error: 'La contraseña actual es incorrecta' }
  await configurarPassword(nueva)
  return { ok: true }
}
