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

// Actualiza fecha y tentativo de vencimientos por ID (solo los que no fueron ajustados manualmente)
export const updateVencimientosFechas = (updates) => {
  if (!updates || updates.length === 0) return
  const updMap = Object.fromEntries(updates.map(u => [u.id, u]))
  const now  = new Date().toISOString()
  const list = (load(KEYS.vencimientos) || []).map(v => {
    const u = updMap[v.id]
    if (!u) return v
    return { ...v, fecha: u.fecha, tentativo: u.tentativo, updatedAt: now }
  })
  persist(KEYS.vencimientos, list)
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

// Helper: merge profundo de tablaAfipCalendario (saved overrides defaults dígito a dígito)
const mergeCalendario = (defaults, saved) => {
  const result = {}
  const allKeys = new Set([...Object.keys(defaults), ...Object.keys(saved)])
  for (const k of allKeys) {
    result[k] = {}
    const dK = defaults[k] || {}
    const sK = saved[k]   || {}
    const allYears = new Set([...Object.keys(dK), ...Object.keys(sK)])
    for (const y of allYears) {
      result[k][y] = {}
      const dY = dK[y] || {}
      const sY = sK[y] || {}
      const allMes = new Set([...Object.keys(dY), ...Object.keys(sY)])
      for (const m of allMes) {
        result[k][y][m] = { ...(dY[m] || {}), ...(sY[m] || {}) }
      }
    }
  }
  return result
}

// Calendario AFIP 2026 — Errepar (Resolución General AFIP)
// Estructura: tablaKey → año → mes_periodo → terminacion → día
// Para tablas de grupos: 0-3 / 4-6 / 7-9 o 0-2 / 3-5 / 6-7 / 8-9
export const CALENDARIO_AFIP_2026 = {
  autonomos: { '2026': {
    '1': {0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:7,8:7,9:7},
    '2': {0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:9,8:9,9:9},
    '3': {0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:9,8:9,9:9},
    '4': {0:6,1:6,2:6,3:6,4:7,5:7,6:7,7:8,8:8,9:8},
    '5': {0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:7,8:7,9:7},
    '6': {0:5,1:5,2:5,3:5,4:8,5:8,6:8,7:9,8:9,9:9},
    '7': {0:6,1:6,2:6,3:6,4:7,5:7,6:7,7:8,8:8,9:8},
    '8': {0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:7,8:7,9:7},
    '9': {0:7,1:7,2:7,3:7,4:8,5:8,6:8,7:9,8:9,9:9},
    '10':{0:5,1:5,2:5,3:5,4:6,5:6,6:6,7:7,8:7,9:7},
    '11':{0:5,1:5,2:5,3:5,4:9,5:9,6:9,7:10,8:10,9:10},
    '12':{0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
  }},
  iva: { '2026': {
    '1': {0:19,1:19,2:19,3:19,4:20,5:20,6:20,7:21,8:21,9:21},
    '2': {0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:20,8:20,9:20},
    '3': {0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:20,8:20,9:20},
    '4': {0:20,1:20,2:20,3:20,4:21,5:21,6:21,7:22,8:22,9:22},
    '5': {0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:20,8:20,9:20},
    '6': {0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:22,8:22,9:22},
    '7': {0:20,1:20,2:20,3:20,4:21,5:21,6:21,7:22,8:22,9:22},
    '8': {0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:20,8:20,9:20},
    '9': {0:18,1:18,2:18,3:18,4:21,5:21,6:21,7:22,8:22,9:22},
    '10':{0:19,1:19,2:19,3:19,4:20,5:20,6:20,7:21,8:21,9:21},
    '11':{0:18,1:18,2:18,3:18,4:19,5:19,6:19,7:20,8:20,9:20},
    '12':{0:18,1:18,2:18,3:18,4:21,5:21,6:21,7:22,8:22,9:22},
  }},
  f931: { '2026': {
    '1': {0:9,1:9,2:9,3:9,4:12,5:12,6:12,7:13,8:13,9:13},
    '2': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '3': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '4': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:13,8:13,9:13},
    '5': {0:11,1:11,2:11,3:11,4:12,5:12,6:12,7:13,8:13,9:13},
    '6': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '7': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15},
    '8': {0:10,1:10,2:10,3:10,4:11,5:11,6:11,7:12,8:12,9:12},
    '9': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '10':{0:9,1:9,2:9,3:9,4:13,5:13,6:13,7:14,8:14,9:14},
    '11':{0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '12':{0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
  }},
  lsd: { '2026': {  // LSD sigue el mismo calendario que F931
    '1': {0:9,1:9,2:9,3:9,4:12,5:12,6:12,7:13,8:13,9:13},
    '2': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '3': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '4': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:13,8:13,9:13},
    '5': {0:11,1:11,2:11,3:11,4:12,5:12,6:12,7:13,8:13,9:13},
    '6': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '7': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15},
    '8': {0:10,1:10,2:10,3:10,4:11,5:11,6:11,7:12,8:12,9:12},
    '9': {0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '10':{0:9,1:9,2:9,3:9,4:13,5:13,6:13,7:14,8:14,9:14},
    '11':{0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
    '12':{0:9,1:9,2:9,3:9,4:10,5:10,6:10,7:11,8:11,9:11},
  }},
  casasParticulares: { '2026': {
    '1': {0:12,1:12,2:12,3:12,4:15,5:15,6:15,7:15,8:15,9:15},
    '2': {0:10,1:10,2:10,3:10,4:18,5:18,6:18,7:18,8:18,9:18},
    '3': {0:10,1:10,2:10,3:10,4:16,5:16,6:16,7:16,8:16,9:16},
    '4': {0:10,1:10,2:10,3:10,4:15,5:15,6:15,7:15,8:15,9:15},
    '5': {0:11,1:11,2:11,3:11,4:15,5:15,6:15,7:15,8:15,9:15},
    '6': {0:10,1:10,2:10,3:10,4:16,5:16,6:16,7:16,8:16,9:16},
    '7': {0:13,1:13,2:13,3:13,4:15,5:15,6:15,7:15,8:15,9:15},
    '8': {0:10,1:10,2:10,3:10,4:18,5:18,6:18,7:18,8:18,9:18},
    '9': {0:10,1:10,2:10,3:10,4:15,5:15,6:15,7:15,8:15,9:15},
    '10':{0:13,1:13,2:13,3:13,4:15,5:15,6:15,7:15,8:15,9:15},
    '11':{0:10,1:10,2:10,3:10,4:16,5:16,6:16,7:16,8:16,9:16},
    '12':{0:10,1:10,2:10,3:10,4:15,5:15,6:15,7:15,8:15,9:15},
  }},
  // Ganancias Sociedades — DDJJ y Anticipos PJ — indexado por (año fiscal, mes de cierre)
  // mesOffset=5: vencimiento = cierre + 5 meses. Filas "Enero..Dic 2026" son vencimientos;
  // la clave es el mes de cierre correspondiente (ej: vence Ene 2026 → cierre Ago 2025).
  gananciasSociedades: {
    '2025': {
      '8': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15}, // vence Ene 2026
      '9': {0:13,1:13,2:13,3:13,4:18,5:18,6:18,7:19,8:19,9:19}, // vence Feb 2026
      '10':{0:13,1:13,2:13,3:13,4:16,5:16,6:16,7:17,8:17,9:17}, // vence Mar 2026
      '11':{0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15}, // vence Abr 2026
      '12':{0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15}, // vence May 2026
    },
    '2026': {
      '1': {0:16,1:16,2:16,3:16,4:17,5:17,6:17,7:18,8:18,9:18}, // vence Jun 2026
      '2': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15}, // vence Jul 2026
      '3': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:18,8:18,9:18}, // vence Ago 2026
      '4': {0:14,1:14,2:14,3:14,4:15,5:15,6:15,7:16,8:16,9:16}, // vence Sep 2026
      '5': {0:13,1:13,2:13,3:13,4:14,5:14,6:14,7:15,8:15,9:15}, // vence Oct 2026
      '6': {0:13,1:13,2:13,3:13,4:16,5:16,6:16,7:17,8:17,9:17}, // vence Nov 2026
      '7': {0:14,1:14,2:14,3:14,4:15,5:15,6:15,7:16,8:16,9:16}, // vence Dic 2026
    },
  },
  // Ganancias Humanas DDJJ — vence en junio del año siguiente al período fiscal
  // PATRON_CUIT con mesOffset=0, mesesAplicables=[6]: el período ES el mes de junio
  // Pago: 0-3→12, 4-6→16, 7-9→17 (datos oficiales AFIP junio 2026)
  gananciasHumanasDDJJ: { '2026': {
    '6': {0:12,1:12,2:12,3:12,4:16,5:16,6:16,7:17,8:17,9:17},
  }},
  // Convenio Multilateral — grupos: 0-2 / 3-5 / 6-7 / 8-9
  iibbCm: { '2026': {
    '1': {0:15,1:15,2:15,3:16,4:16,5:16,6:19,7:19,8:20,9:20},
    '2': {0:13,1:13,2:13,3:18,4:18,5:18,6:19,7:19,8:20,9:20},
    '3': {0:13,1:13,2:13,3:16,4:16,5:16,6:17,7:17,8:18,9:18},
    '4': {0:15,1:15,2:15,3:16,4:16,5:16,6:17,7:17,8:20,9:20},
    '5': {0:15,1:15,2:15,3:18,4:18,5:18,6:19,7:19,8:20,9:20},
    '6': {0:16,1:16,2:16,3:17,4:17,5:17,6:18,7:18,8:19,9:19},
    '7': {0:15,1:15,2:15,3:16,4:16,5:16,6:17,7:17,8:20,9:20},
    '8': {0:14,1:14,2:14,3:18,4:18,5:18,6:19,7:19,8:20,9:20},
    '9': {0:15,1:15,2:15,3:16,4:16,5:16,6:17,7:17,8:18,9:18},
    '10':{0:15,1:15,2:15,3:16,4:16,5:16,6:19,7:19,8:20,9:20},
    '11':{0:13,1:13,2:13,3:16,4:16,5:16,6:17,7:17,8:18,9:18},
    '12':{0:15,1:15,2:15,3:16,4:16,5:16,6:17,7:17,8:18,9:18},
  }},
}

// Helper: merge profundo de tablaFechasProvincia (prov → año → mes → grupos)
const mergeTablaProvincias = (defaults, saved) => {
  const result = {}
  const allProvs = new Set([...Object.keys(defaults), ...Object.keys(saved)])
  for (const p of allProvs) {
    result[p] = {}
    const dP = defaults[p] || {}
    const sP = saved[p]   || {}
    const allYears = new Set([...Object.keys(dP), ...Object.keys(sP)])
    for (const y of allYears) {
      result[p][y] = {}
      const dY = dP[y] || {}
      const sY = sP[y] || {}
      const allMes = new Set([...Object.keys(dY), ...Object.keys(sY)])
      for (const m of allMes) {
        result[p][y][m] = { ...(dY[m] || {}), ...(sY[m] || {}) }
      }
    }
  }
  return result
}

const DEFAULT_CONFIG = {
  estudio: { nombre: 'Estudio Contable', cuit: '' },
  alertasDias: [7, 3, 1],
  horizonte: 12,           // meses para generar vencimientos
  tablaAfip: {
    // terminación CUIT (0-9) → día del mes (fallback genérico)
    iva:                { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
    autonomos:          { 0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7:10, 8:11, 9:12 },
    f931:               { 0: 9, 1:10, 2:11, 3:12, 4:13, 5:14, 6: 9, 7:10, 8:11, 9:12 },
    lsd:                { 0: 9, 1:10, 2:11, 3:12, 4:13, 5:14, 6: 9, 7:10, 8:11, 9:12 },
    casasParticulares:  { 0: 7, 1: 8, 2: 9, 3:10, 4:11, 5: 7, 6: 8, 7: 9, 8:10, 9:11 },
    iibbCm:             { 0:17, 1:18, 2:19, 3:20, 4:21, 5:22, 6:23, 7:24, 8:25, 9:26 },
    gananciasHumanas:      { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
    bienesPersonales:      { 0:19, 1:19, 2:21, 3:21, 4:22, 5:22, 6:23, 7:23, 8:24, 9:24 },
    gananciasSociedades:   { 0:13, 1:14, 2:15, 3:16, 4:17, 5:18, 6:13, 7:14, 8:15, 9:16 },
    gananciasHumanasDDJJ:  { 0:12, 1:12, 2:12, 3:12, 4:16, 5:16, 6:16, 7:17, 8:17, 9:17 },
  },
  // Calendario exacto publicado por AFIP: { tablaKey: { 'año': { 'mes_periodo': { 'terminacion': dia } } } }
  tablaAfipCalendario: CALENDARIO_AFIP_2026,
  // Fechas manuales para obligaciones de día fijo: { obligacionId: { 'año': { 'mes': dia } } }
  tablaFechasFijas: {},
  // Configuración de grupos de CUIT por provincia: { 'provincia': { grupos: ['0-1','2-3',...] } }
  configuracionProvincias: {
    chaco: { grupos: ['0-1', '2-3', '4-5', '6-7', '8-9'] },
  },
  // Fechas IIBB por provincia: { 'provincia': { 'año': { 'mes': { 'grupo': dia } } } }
  tablaFechasProvincia: {
    chaco: {
      '2026': {
        '6': { '0-1': 18, '2-3': 19, '4-5': 22, '6-7': 23, '8-9': 24 },
      },
    },
  },
}

export const getConfig  = () => {
  const saved = load(KEYS.config) || {}
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    tablaAfip: { ...DEFAULT_CONFIG.tablaAfip, ...(saved.tablaAfip || {}) },
    // Merge profundo: defaults (2026) + ediciones del usuario; ediciones tienen prioridad
    tablaAfipCalendario: mergeCalendario(DEFAULT_CONFIG.tablaAfipCalendario, saved.tablaAfipCalendario || {}),
    tablaFechasFijas:         { ...DEFAULT_CONFIG.tablaFechasFijas, ...(saved.tablaFechasFijas || {}) },
    configuracionProvincias:  {
      ...DEFAULT_CONFIG.configuracionProvincias,
      ...(saved.configuracionProvincias || {}),
    },
    tablaFechasProvincia: mergeTablaProvincias(
      DEFAULT_CONFIG.tablaFechasProvincia,
      saved.tablaFechasProvincia || {}
    ),
  }
}
export const saveConfig = (data) => { persist(KEYS.config, { ...(load(KEYS.config) || {}), ...data }) }

// ─── inicialización ───────────────────────────────────────────────────────────

export const isInitialized = () => load(KEYS.initialized) === true
export const setInitialized = () => save(KEYS.initialized, true)
