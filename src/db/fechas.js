// Estrategias de cálculo de fechas de vencimiento.
// Sistema data-driven: cada TipoObligacion tiene un 'patron' + 'configuracion'.
// Agregar un nuevo patrón = agregar una función aquí. Sin tocar otra lógica.

import { addMonths, setDate, getDaysInMonth, parseISO, format, getMonth, getYear, addDays } from 'date-fns'

export const PATRONES = {
  PATRON_CUIT:           'PATRON_CUIT',
  PATRON_DIA_FIJO:       'PATRON_DIA_FIJO',
  PATRON_DIAS_CIERRE:    'PATRON_DIAS_CIERRE',
  PATRON_FECHA_PROVINCIA:'PATRON_FECHA_PROVINCIA',
  PATRON_SEMESTRAL_FIJO: 'PATRON_SEMESTRAL_FIJO',
  PATRON_PERSONALIZADO:  'PATRON_PERSONALIZADO',
}

export const PATRONES_LABELS = {
  PATRON_CUIT:           'Por terminación de CUIT (tabla AFIP)',
  PATRON_DIA_FIJO:       'Día fijo del mes',
  PATRON_DIAS_CIERRE:    'Días después del cierre de ejercicio',
  PATRON_FECHA_PROVINCIA:'Fecha configurable por provincia',
  PATRON_SEMESTRAL_FIJO: 'Meses fijos del año (semestral)',
  PATRON_PERSONALIZADO:  'Fechas personalizadas',
}

// Extrae terminación CUIT (último dígito del CUIT formateado "20-12345678-9" → 9)
export const terminacionCuit = (cuit) => {
  if (!cuit) return 0
  const digits = String(cuit).replace(/\D/g, '')
  return parseInt(digits[digits.length - 1] || '0', 10)
}

// Ajusta fecha si cae en fin de semana: adelanta al viernes anterior
const ajustarFinDeSemana = (date) => {
  const dia = date.getDay() // 0=dom, 6=sab
  if (dia === 0) return addDays(date, -2)
  if (dia === 6) return addDays(date, -1)
  return date
}

// Construye una fecha segura para un mes/año con día máximo del mes
const fechaSegura = (anio, mes, dia) => {
  const maxDia = getDaysInMonth(new Date(anio, mes - 1, 1))
  return new Date(anio, mes - 1, Math.min(dia, maxDia))
}

// ─── PATRON_CUIT ──────────────────────────────────────────────────────────────
// Genera vencimientos mensuales donde el día depende de la terminación del CUIT.
// config: { tablaKey: 'iva' | 'autonomos' | ... , mesOffset: 1, tablaAfip }
//   mesOffset: 1 = vence el mes siguiente al período (IVA, F931)
//              0 = vence en el mismo mes del período (autónomos)
export const calcPatronCuit = ({ anio, mes, terminacion, config, tablaAfip }) => {
  const tabla  = tablaAfip[config.tablaKey] || {}
  const dia    = tabla[terminacion] || 20
  const offset = config.mesOffset ?? 1
  const mesVenc = mes + offset
  const anioVenc = anio + Math.floor((mesVenc - 1) / 12)
  const mesVencNorm = ((mesVenc - 1) % 12) + 1
  const fecha = fechaSegura(anioVenc, mesVencNorm, dia)
  return format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd')
}

// ─── PATRON_DIA_FIJO ──────────────────────────────────────────────────────────
// config: { dia: 20 }
export const calcPatronDiaFijo = ({ anio, mes, config }) => {
  const fecha = fechaSegura(anio, mes, config.dia || 20)
  return format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd')
}

// ─── PATRON_SEMESTRAL_FIJO ────────────────────────────────────────────────────
// config: { meses: [1, 7], dia: 20 }
// Devuelve null si el mes no corresponde
export const calcPatronSemestralFijo = ({ anio, mes, config }) => {
  const meses = config.meses || [1, 7]
  if (!meses.includes(mes)) return null
  const fecha = fechaSegura(anio, mes, config.dia || 20)
  return format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd')
}

// ─── PATRON_DIAS_CIERRE ───────────────────────────────────────────────────────
// config: { mesesDespues: 5, tablaKey: 'iva' (opcional para ajuste CUIT) }
// fechaCierreEjercicio: "MM-DD" ej "03-31" para cierre 31/03
export const calcPatronDiasCierre = ({ anio, fechaCierreEjercicio, terminacion, config, tablaAfip }) => {
  if (!fechaCierreEjercicio) return null
  const [mesCierre, diaCierre] = fechaCierreEjercicio.split('-').map(Number)
  // El ejercicio cierra en mesCierre/diaCierre/anio, vence config.mesesDespues meses después
  const fechaCierre = new Date(anio, mesCierre - 1, diaCierre)
  let fechaBase = addMonths(fechaCierre, config.mesesDespues || 5)
  // Ajuste opcional por CUIT
  if (config.tablaKey && tablaAfip[config.tablaKey]) {
    const dia = tablaAfip[config.tablaKey][terminacion] || 20
    fechaBase = fechaSegura(getYear(fechaBase), getMonth(fechaBase) + 1, dia)
  }
  return format(ajustarFinDeSemana(fechaBase), 'yyyy-MM-dd')
}

// ─── PATRON_FECHA_PROVINCIA ───────────────────────────────────────────────────
// config: { dia: 15, provincia: 'Chaco' }
export const calcPatronFechaProvincia = ({ anio, mes, config }) => {
  const fecha = fechaSegura(anio, mes, config.dia || 15)
  return format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd')
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export const calcularFechaVencimiento = ({ patron, anio, mes, cliente, config, tablaAfip }) => {
  const term = terminacionCuit(cliente?.cuit)
  const fechaCierre = cliente?.fechaCierreEjercicio

  switch (patron) {
    case PATRONES.PATRON_CUIT:
      return calcPatronCuit({ anio, mes, terminacion: term, config, tablaAfip })
    case PATRONES.PATRON_DIA_FIJO:
      return calcPatronDiaFijo({ anio, mes, config })
    case PATRONES.PATRON_SEMESTRAL_FIJO:
      return calcPatronSemestralFijo({ anio, mes, config })
    case PATRONES.PATRON_DIAS_CIERRE:
      // Para anticipos de PJ: se genera una vez por ejercicio
      return calcPatronDiasCierre({ anio, fechaCierreEjercicio: fechaCierre, terminacion: term, config, tablaAfip })
    case PATRONES.PATRON_FECHA_PROVINCIA:
      return calcPatronFechaProvincia({ anio, mes, config })
    default:
      return null
  }
}
