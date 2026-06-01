// Capa de almacenamiento usando localStorage.
// Fácilmente reemplazable por SQLite/Electron IPC en el futuro.

const KEYS = {
  clientes:        'vc_clientes',
  tiposObligacion: 'vc_tipos_obligacion',
  obligaciones:    'vc_obligaciones',      // relación cliente ↔ tipo
  vencimientos:    'vc_vencimientos',
  config:          'vc_config',
  initialized:     'vc_initialized',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
const save = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

let listeners = []
export const subscribe  = (fn) => { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }
const notify = () => listeners.forEach(fn => fn())

const persist = (key, value) => { save(key, value); notify() }

const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()

// ─── clientes ─────────────────────────────────────────────────────────────────

export const getClientes = () => load(KEYS.clientes) || []
export const getCliente  = (id) => getClientes().find(c => c.id === id)

export const saveCliente = (data) => {
  const list = getClientes()
  const now  = new Date().toISOString()
  if (data.id) {
    const idx = list.findIndex(c => c.id === data.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: now }
    else list.push(data)
  } else {
    list.push({ ...data, id: uuid(), createdAt: now, updatedAt: now })
  }
  persist(KEYS.clientes, list)
  return list
}

export const deleteCliente = (id) => {
  persist(KEYS.clientes, getClientes().filter(c => c.id !== id))
  // Eliminar obligaciones y vencimientos asociados
  persist(KEYS.obligaciones, getObligacionesCliente().filter(o => o.clienteId !== id))
  persist(KEYS.vencimientos, getVencimientos().filter(v => v.clienteId !== id))
}

// ─── tipos de obligación ─────────────────────────────────────────────────────

export const getTiposObligacion  = () => load(KEYS.tiposObligacion) || []
export const getTipoObligacion   = (id) => getTiposObligacion().find(t => t.id === id)

export const saveTipoObligacion = (data) => {
  const list = getTiposObligacion()
  const now  = new Date().toISOString()
  if (data.id) {
    const idx = list.findIndex(t => t.id === data.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: now }
    else list.push(data)
  } else {
    list.push({ ...data, id: uuid(), createdAt: now, updatedAt: now })
  }
  persist(KEYS.tiposObligacion, list)
  return list
}

export const deleteTipoObligacion = (id) => {
  persist(KEYS.tiposObligacion, getTiposObligacion().filter(t => t.id !== id))
}

// ─── obligaciones (relación cliente ↔ tipo) ───────────────────────────────────

export const getObligacionesCliente  = (clienteId) => {
  const all = load(KEYS.obligaciones) || []
  return clienteId ? all.filter(o => o.clienteId === clienteId) : all
}

export const saveObligacionCliente = (data) => {
  const list = load(KEYS.obligaciones) || []
  const now  = new Date().toISOString()
  if (data.id) {
    const idx = list.findIndex(o => o.id === data.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: now }
    else list.push({ ...data, updatedAt: now })
  } else {
    list.push({ ...data, id: uuid(), createdAt: now, updatedAt: now })
  }
  persist(KEYS.obligaciones, list)
  return list
}

export const deleteObligacionCliente = (id) => {
  const obl = (load(KEYS.obligaciones) || []).find(o => o.id === id)
  persist(KEYS.obligaciones, (load(KEYS.obligaciones) || []).filter(o => o.id !== id))
  if (obl) {
    persist(KEYS.vencimientos, getVencimientos().filter(v => v.obligacionClienteId !== id))
  }
}

// ─── vencimientos ─────────────────────────────────────────────────────────────

export const getVencimientos = (filters = {}) => {
  let list = load(KEYS.vencimientos) || []
  if (filters.clienteId) list = list.filter(v => v.clienteId === filters.clienteId)
  if (filters.estado)    list = list.filter(v => v.estado === filters.estado)
  if (filters.desde)     list = list.filter(v => v.fecha >= filters.desde)
  if (filters.hasta)     list = list.filter(v => v.fecha <= filters.hasta)
  return list
}

export const getVencimiento = (id) => (load(KEYS.vencimientos) || []).find(v => v.id === id)

export const saveVencimiento = (data) => {
  const list = load(KEYS.vencimientos) || []
  const now  = new Date().toISOString()
  if (data.id) {
    const idx = list.findIndex(v => v.id === data.id)
    if (idx >= 0) list[idx] = { ...list[idx], ...data, updatedAt: now }
    else list.push(data)
  } else {
    list.push({ ...data, id: uuid(), createdAt: now, updatedAt: now })
  }
  persist(KEYS.vencimientos, list)
  return list
}

export const bulkSaveVencimientos = (vencimientosNuevos) => {
  const list = load(KEYS.vencimientos) || []
  const now  = new Date().toISOString()
  const nuevos = vencimientosNuevos.map(v =>
    v.id ? v : { ...v, id: uuid(), createdAt: now, updatedAt: now }
  )
  // Merge: si ya existe mismo obligacionClienteId + periodo, no duplicar
  const existingKeys = new Set(list.map(v => `${v.obligacionClienteId}__${v.periodo}`))
  const toAdd = nuevos.filter(v => !existingKeys.has(`${v.obligacionClienteId}__${v.periodo}`))
  const merged = [...list, ...toAdd]
  persist(KEYS.vencimientos, merged)
  return merged
}

export const deleteVencimiento = (id) => {
  persist(KEYS.vencimientos, (load(KEYS.vencimientos) || []).filter(v => v.id !== id))
}

// Recalcula estado VENCIDO para los que pasaron la fecha sin acción
export const actualizarEstadosVencidos = () => {
  const hoy  = new Date().toISOString().slice(0, 10)
  const list = load(KEYS.vencimientos) || []
  let changed = false
  const updated = list.map(v => {
    if (v.estado === 'pendiente' && v.fecha < hoy) {
      changed = true
      return { ...v, estado: 'vencido', updatedAt: new Date().toISOString() }
    }
    return v
  })
  if (changed) persist(KEYS.vencimientos, updated)
}

// ─── configuración ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  estudio: { nombre: 'Estudio Contable', cuit: '' },
  alertasDias: [7, 3, 1],
  horizonte: 12,           // meses para generar vencimientos
  tablaAfip: {
    // terminación CUIT (0-9) → día del mes
    iva:                { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
    autonomos:          { 0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7:10, 8:11, 9:12 },
    f931:               { 0: 9, 1:10, 2:11, 3:12, 4:13, 5:14, 6: 9, 7:10, 8:11, 9:12 },
    lsd:                { 0: 9, 1:10, 2:11, 3:12, 4:13, 5:14, 6: 9, 7:10, 8:11, 9:12 },
    casasParticulares:  { 0: 7, 1: 8, 2: 9, 3:10, 4:11, 5: 7, 6: 8, 7: 9, 8:10, 9:11 },
    iibbCm:             { 0:17, 1:18, 2:19, 3:20, 4:21, 5:22, 6:23, 7:24, 8:25, 9:26 },
    gananciasHumanas:   { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
    bienesPersonales:   { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
  },
  // Calendario exacto publicado por AFIP: { tablaKey: { 'año': { 'mes_periodo': { 'terminacion': dia } } } }
  tablaAfipCalendario: {},
}

export const getConfig  = () => {
  const saved = load(KEYS.config) || {}
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    tablaAfip: { ...DEFAULT_CONFIG.tablaAfip, ...(saved.tablaAfip || {}) },
    tablaAfipCalendario: saved.tablaAfipCalendario || {},
  }
}
export const saveConfig = (data) => { persist(KEYS.config, { ...(load(KEYS.config) || {}), ...data }) }

// ─── inicialización ───────────────────────────────────────────────────────────

export const isInitialized = () => load(KEYS.initialized) === true
export const setInitialized = () => save(KEYS.initialized, true)
