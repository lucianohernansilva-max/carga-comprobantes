// Módulo de comprobantes: storage, detección de formato, parsers, exportación.

import * as XLSX from 'xlsx'

const KEY = 'vc_comprobantes'
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
const save = (list) => localStorage.setItem(KEY, JSON.stringify(list))
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now()

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const getComprobantes = (filters = {}) => {
  let list = load()
  if (filters.clienteId) list = list.filter(c => c.clienteId === filters.clienteId)
  if (filters.origen)    list = list.filter(c => c.origen    === filters.origen)
  if (filters.tipo)      list = list.filter(c => c.tipo      === filters.tipo)
  if (filters.periodo)   list = list.filter(c => c.periodo   === filters.periodo)
  return list
}

export const bulkSaveComprobantes = (items) => {
  const existing = load()
  const now = new Date().toISOString()
  const nuevos = items.map(item => ({ ...item, id: uuid(), importedAt: now }))
  const merged = [...existing, ...nuevos]
  save(merged)
  return merged
}

export const deleteComprobantes = (ids) => {
  const set = new Set(ids)
  save(load().filter(c => !set.has(c.id)))
}

export const deleteComprobantesGrupo = (clienteId, origen, tipo, periodo) => {
  save(load().filter(c => !(
    c.clienteId === clienteId &&
    (!origen  || c.origen  === origen)  &&
    (!tipo    || c.tipo    === tipo)    &&
    (!periodo || c.periodo === periodo)
  )))
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const ORIGENES = {
  MIS_COMPROBANTES: 'mis_comprobantes',
  PORTAL_IVA:       'portal_iva',
  CARTA_PORTE:      'carta_porte',
}

export const ORIGENES_LABELS = {
  mis_comprobantes: 'Mis Comprobantes (AFIP)',
  portal_iva:       'Portal IVA (AFIP)',
  carta_porte:      'Cartas de Porte',
}

// ─── Detección de formato ─────────────────────────────────────────────────────

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

export const detectarFormato = (headers) => {
  const hh = headers.map(norm)
  const has = (...terms) => terms.some(t => hh.some(h => h.includes(t)))
  if (has('carta de porte', 'ctg', 'especie', 'establecimiento origen')) return ORIGENES.CARTA_PORTE
  if (has('base imponible', 'base imp', 'alicuota', 'alícuota'))          return ORIGENES.PORTAL_IVA
  if (has('punto de venta', 'pto. venta', 'pto venta') || has('imp. total', 'imp. neto', 'neto gravado')) return ORIGENES.MIS_COMPROBANTES
  return null
}

// ─── Definición de campos por formato ────────────────────────────────────────
// aliases: palabras clave (se busca inclusión, normalizado)

export const CAMPOS = {
  [ORIGENES.MIS_COMPROBANTES]: [
    { key: 'fecha',          label: 'Fecha',           required: true,  aliases: ['fecha comprobante','fecha emision','fecha'] },
    { key: 'tipoComprobante',label: 'Tipo Comprobante', required: true,  aliases: ['tipo comprobante','tipo comp','comprobante','tipo'] },
    { key: 'puntoVenta',     label: 'Punto de Venta',  required: false, aliases: ['punto de venta','pto. venta','pto venta','p.venta'] },
    { key: 'numero',         label: 'Número',          required: true,  aliases: ['numero desde','nro. desde','numero','nro.','numero comprobante'] },
    { key: 'cuitContraparte',label: 'CUIT',            required: false, aliases: ['cuit receptor','cuit emisor','nro. doc. receptor','nro. doc. emisor','cuit'] },
    { key: 'denominacion',   label: 'Denominación',    required: false, aliases: ['denominacion receptor','denominacion emisor','denominacion','razon social'] },
    { key: 'importeTotal',   label: 'Importe Total',   required: true,  aliases: ['imp. total','importe total','total'] },
    { key: 'netoGravado',    label: 'Neto Gravado',    required: false, aliases: ['imp. neto gravado','neto gravado total','neto gravado','neto'] },
    { key: 'iva',            label: 'IVA',             required: false, aliases: ['imp. iva 21%','iva 21%','imp. iva 10,5%','imp. iva','iva'] },
  ],
  [ORIGENES.PORTAL_IVA]: [
    { key: 'periodo',        label: 'Período',         required: true,  aliases: ['periodo fiscal','periodo'] },
    { key: 'cuitContraparte',label: 'CUIT',            required: true,  aliases: ['cuit emisor','nro. doc.','cuit'] },
    { key: 'denominacion',   label: 'Razón Social',    required: false, aliases: ['razon social','denominacion'] },
    { key: 'tipoComprobante',label: 'Tipo Comp.',      required: false, aliases: ['tipo comp.','tipo comprobante','tipo'] },
    { key: 'numero',         label: 'Número',          required: false, aliases: ['nro. comprobante','numero','nro.'] },
    { key: 'baseImponible',  label: 'Base Imponible',  required: true,  aliases: ['base imponible','base imp.','base'] },
    { key: 'alicuota',       label: 'Alícuota %',      required: false, aliases: ['alicuota %','% iva','alicuota'] },
    { key: 'iva',            label: 'IVA',             required: true,  aliases: ['monto iva','cuota iva','imp. iva','iva'] },
    { key: 'importeTotal',   label: 'Total',           required: false, aliases: ['importe total','imp. total','total'] },
  ],
  [ORIGENES.CARTA_PORTE]: [
    { key: 'numeroCDP',      label: 'N° Carta de Porte', required: true,  aliases: ['nro. carta de porte','carta de porte','numero ctg','ctg'] },
    { key: 'fecha',          label: 'Fecha',             required: true,  aliases: ['fecha emision','fecha de emision','fecha'] },
    { key: 'cuitContraparte',label: 'CUIT Destinatario', required: false, aliases: ['cuit destinatario','cuit dest.','cuit'] },
    { key: 'denominacion',   label: 'Destinatario',      required: false, aliases: ['razon social destinatario','destinatario'] },
    { key: 'producto',       label: 'Especie/Producto',  required: true,  aliases: ['especie','grano','cultivo','producto'] },
    { key: 'cantidad',       label: 'Cantidad (kg)',     required: false, aliases: ['cantidad kg','toneladas','cantidad','kg','peso'] },
    { key: 'unidad',         label: 'Unidad',            required: false, aliases: ['unidad medida','unid.','unidad'] },
    { key: 'origenLP',       label: 'Origen',            required: false, aliases: ['localidad origen','establecimiento origen','origen'] },
    { key: 'destinoLP',      label: 'Destino',           required: false, aliases: ['localidad destino','destino/planta','planta','destino'] },
    { key: 'estado',         label: 'Estado',            required: false, aliases: ['estado ctg','estado'] },
  ],
}

// Auto-mapea headers del Excel a campos conocidos
// Retorna: { campo.key → índice de columna en el array de la fila }
export const autoMapear = (headers, origen) => {
  const campos = CAMPOS[origen] || []
  const hh = headers.map(norm)
  const mapping = {}
  for (const campo of campos) {
    // Buscar en orden: coincidencia exacta primero, luego inclusión
    let idx = hh.findIndex(h => campo.aliases.some(a => h === norm(a)))
    if (idx < 0) idx = hh.findIndex(h => campo.aliases.some(a => h.includes(norm(a)) || norm(a).includes(h)))
    if (idx >= 0) mapping[campo.key] = idx
  }
  return mapping
}

export const mapeoCompleto = (mapping, origen) =>
  (CAMPOS[origen] || []).filter(c => c.required).every(c => mapping[c.key] !== undefined)

// ─── Helpers de parseo ────────────────────────────────────────────────────────

const parseNum = (v) => {
  if (v == null || v === '') return 0
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

const parseDate = (v) => {
  if (v == null || v === '') return ''
  // Excel serial number
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v)
      if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
    } catch {}
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return s.slice(0, 10)
  return s
}

const parsePeriodo = (v) => {
  if (!v) return ''
  const s = String(v).trim()
  if (/^\d{6}$/.test(s)) return `${s.slice(0,4)}-${s.slice(4,6)}`
  let m = s.match(/^(\d{1,2})\/(\d{4})/)
  if (m) return `${m[2]}-${m[1].padStart(2,'0')}`
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0,7)
  return s
}

const fechaToPeriodo = (f) => (f && f.length >= 7 ? f.slice(0,7) : '')

const get = (row, mapping, key) => {
  const idx = mapping[key]
  return idx !== undefined ? row[idx] : undefined
}

// ─── Parsers por formato ──────────────────────────────────────────────────────

export const parsearRows = (rows, mapping, origen, clienteId, tipo) =>
  rows.map(row => {
    if (!Array.isArray(row) || row.every(v => v === '' || v == null)) return null

    if (origen === ORIGENES.MIS_COMPROBANTES) {
      const fecha = parseDate(get(row, mapping, 'fecha'))
      const importeTotal = parseNum(get(row, mapping, 'importeTotal'))
      if (!fecha && !importeTotal) return null
      return {
        clienteId, origen, tipo,
        fecha, periodo: fechaToPeriodo(fecha),
        tipoComprobante: String(get(row, mapping, 'tipoComprobante') ?? '').trim(),
        puntoVenta:      String(get(row, mapping, 'puntoVenta')      ?? '').trim(),
        numero:          String(get(row, mapping, 'numero')          ?? '').trim(),
        cuitContraparte: String(get(row, mapping, 'cuitContraparte') ?? '').replace(/\D/g, ''),
        denominacion:    String(get(row, mapping, 'denominacion')    ?? '').trim(),
        importeTotal,
        netoGravado: parseNum(get(row, mapping, 'netoGravado')),
        iva:         parseNum(get(row, mapping, 'iva')),
      }
    }

    if (origen === ORIGENES.PORTAL_IVA) {
      const periodo = parsePeriodo(get(row, mapping, 'periodo'))
      const iva     = parseNum(get(row, mapping, 'iva'))
      if (!periodo && !iva) return null
      return {
        clienteId, origen, tipo,
        fecha: periodo ? `${periodo}-01` : '',
        periodo,
        tipoComprobante: String(get(row, mapping, 'tipoComprobante') ?? '').trim(),
        numero:          String(get(row, mapping, 'numero')          ?? '').trim(),
        cuitContraparte: String(get(row, mapping, 'cuitContraparte') ?? '').replace(/\D/g, ''),
        denominacion:    String(get(row, mapping, 'denominacion')    ?? '').trim(),
        baseImponible:   parseNum(get(row, mapping, 'baseImponible')),
        alicuota:        parseNum(get(row, mapping, 'alicuota')),
        iva,
        importeTotal:    parseNum(get(row, mapping, 'importeTotal')),
        netoGravado:     parseNum(get(row, mapping, 'baseImponible')),
      }
    }

    if (origen === ORIGENES.CARTA_PORTE) {
      const numeroCDP = String(get(row, mapping, 'numeroCDP') ?? '').trim()
      const fecha     = parseDate(get(row, mapping, 'fecha'))
      if (!numeroCDP && !fecha) return null
      return {
        clienteId, origen, tipo: 'emitido',
        fecha, periodo: fechaToPeriodo(fecha),
        numeroCDP,
        cuitContraparte: String(get(row, mapping, 'cuitContraparte') ?? '').replace(/\D/g, ''),
        denominacion:    String(get(row, mapping, 'denominacion')    ?? '').trim(),
        producto:        String(get(row, mapping, 'producto')        ?? '').trim(),
        cantidad:        parseNum(get(row, mapping, 'cantidad')),
        unidad:          String(get(row, mapping, 'unidad')          ?? '').trim(),
        origenLP:        String(get(row, mapping, 'origenLP')        ?? '').trim(),
        destinoLP:       String(get(row, mapping, 'destinoLP')       ?? '').trim(),
        estado:          String(get(row, mapping, 'estado')          ?? '').trim(),
        importeTotal: 0, iva: 0, netoGravado: 0,
      }
    }
    return null
  }).filter(Boolean)

// Lee un archivo Excel y devuelve { headers, rows }
export const leerExcel = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
      // Find first row with ≥3 non-empty cells (the header row)
      let headerIdx = 0
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        if ((raw[i] || []).filter(v => v !== '').length >= 3) { headerIdx = i; break }
      }
      const headers = (raw[headerIdx] || []).map(h => String(h).trim())
      resolve({ headers, rows: raw.slice(headerIdx + 1) })
    } catch (err) { reject(err) }
  }
  reader.onerror = reject
  reader.readAsArrayBuffer(file)
})

// ─── Exportación ─────────────────────────────────────────────────────────────

export const exportarExcel = (comprobantes, clienteMap, filename) => {
  const rows = comprobantes.map(c => ({
    'Fecha':            c.fecha,
    'Período':          c.periodo,
    'Cliente':          clienteMap[c.clienteId] || '',
    'Origen':           ORIGENES_LABELS[c.origen] || c.origen,
    'Tipo':             c.tipo === 'emitido' ? 'Emitido' : c.tipo === 'recibido' ? 'Recibido' : c.tipo,
    'Tipo Comprobante': c.tipoComprobante || c.numeroCDP || c.producto || '',
    'N°':               c.numero || c.numeroCDP || '',
    'CUIT':             c.cuitContraparte || '',
    'Denominación':     c.denominacion || '',
    'Neto Gravado':     c.netoGravado  || 0,
    'IVA':              c.iva          || 0,
    'Total':            c.importeTotal || 0,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [12,8,22,20,10,18,14,15,30,14,12,14].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Comprobantes')
  XLSX.writeFile(wb, filename || `comprobantes_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// Exporta resumen IVA mensual por cliente
export const exportarResumenIVA = (comprobantes, clienteMap, filename) => {
  const grupos = {}
  for (const c of comprobantes) {
    const key = `${c.clienteId}__${c.periodo}`
    if (!grupos[key]) grupos[key] = { clienteId: c.clienteId, periodo: c.periodo, debito: 0, credito: 0, totalEmitido: 0, totalRecibido: 0 }
    const g = grupos[key]
    if (c.tipo === 'emitido')  { g.debito       += c.iva || 0; g.totalEmitido  += c.importeTotal || 0 }
    if (c.tipo === 'recibido') { g.credito      += c.iva || 0; g.totalRecibido += c.importeTotal || 0 }
  }
  const rows = Object.values(grupos).sort((a,b) => (a.periodo + a.clienteId).localeCompare(b.periodo + b.clienteId)).map(g => ({
    'Cliente':         clienteMap[g.clienteId] || g.clienteId,
    'Período':         g.periodo,
    'Total Facturado': g.totalEmitido,
    'IVA Débito':      g.debito,
    'IVA Crédito':     g.credito,
    'Saldo IVA':       +(g.debito - g.credito).toFixed(2),
    'Total Compras':   g.totalRecibido,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [25,10,16,14,14,14,16].map(w => ({ wch: w }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen IVA')
  XLSX.writeFile(wb, filename || `resumen_iva_${new Date().toISOString().slice(0,10)}.xlsx`)
}
