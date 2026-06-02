// Estrategias de cálculo de fechas de vencimiento.
// Sistema data-driven: cada TipoObligacion tiene un 'patron' + 'configuracion'.
// Agregar un nuevo patrón = agregar una función aquí. Sin tocar otra lógica.

import { addMonths, getDaysInMonth, format, getMonth, getYear, addDays } from 'date-fns'

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

// Extrae terminación CUIT — el dígito verificador, último grupo tras el último guión.
// Formato canónico AFIP: XX-XXXXXXXX-X  (ej: 20-25678901-4 → 4)
// También soporta: "20123456784" (11 dígitos sin guiones) → 4
export const terminacionCuit = (cuit) => {
  if (!cuit) return 0
  const str = String(cuit).trim()

  // Caso 1 — formato canónico con guiones: XX-XXXXXXXX-X
  const partes = str.split('-')
  if (partes.length === 3) {
    const verif = partes[2].trim().replace(/\D/g, '')
    if (verif.length > 0) return parseInt(verif[0], 10)
  }

  // Caso 2 — sin guiones, 11 dígitos: el último es el verificador
  const digits = str.replace(/\D/g, '')
  return parseInt(digits[digits.length - 1] || '0', 10)
}

// Ajusta fecha si cae en fin de semana: retrocede al viernes anterior
const ajustarFinDeSemana = (date) => {
  const dia = date.getDay()
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
// Retorna { fecha: 'YYYY-MM-DD', tentativo: boolean }
//
// Prioridad de consulta:
//   1. calendario[tablaKey][anio][mes_periodo][terminacion] → fecha exacta publicada por AFIP
//   2. tablaAfip[tablaKey][terminacion]                     → día genérico (fallback, tentativo)
//
// config: { tablaKey, mesOffset }
//   mesOffset: 1 = vence mes siguiente al período (IVA, F931)
//              0 = vence en el mismo mes del período (autónomos)
export const calcPatronCuit = ({ anio, mes, terminacion, patronConfig, tablaAfip, calendario }) => {
  const tablaKey = patronConfig.tablaKey
  const offset   = patronConfig.mesOffset ?? 1

  // ── Intentar con calendario exacto ──────────────────────────────────────
  const diaExacto = calendario?.[tablaKey]?.[String(anio)]?.[String(mes)]?.[String(terminacion)]
  if (diaExacto != null) {
    // diaExacto es un número (día del mes de vencimiento)
    const mesVenc     = mes + offset
    const anioVenc    = anio + Math.floor((mesVenc - 1) / 12)
    const mesVencNorm = ((mesVenc - 1) % 12) + 1
    const fecha = fechaSegura(anioVenc, mesVencNorm, Number(diaExacto))
    return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: false }
  }

  // ── Fallback: día genérico de la tabla anual ─────────────────────────────
  const tabla = tablaAfip?.[tablaKey] || {}
  const dia   = tabla[String(terminacion)] ?? 20
  const mesVenc     = mes + offset
  const anioVenc    = anio + Math.floor((mesVenc - 1) / 12)
  const mesVencNorm = ((mesVenc - 1) % 12) + 1
  const fecha = fechaSegura(anioVenc, mesVencNorm, dia)
  return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: true }
}

// ─── PATRON_DIA_FIJO ──────────────────────────────────────────────────────────
export const calcPatronDiaFijo = ({ anio, mes, patronConfig, appConfig, obligacionId }) => {
  const diaManual = appConfig?.tablaFechasFijas?.[obligacionId]?.[String(anio)]?.[String(mes)]
  const dia = diaManual != null ? diaManual : (patronConfig.dia || 20)
  const fecha = fechaSegura(anio, mes, dia)
  return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: diaManual == null }
}

// ─── PATRON_SEMESTRAL_FIJO ────────────────────────────────────────────────────
// Retorna null (no genera) si el mes no corresponde
export const calcPatronSemestralFijo = ({ anio, mes, patronConfig }) => {
  const meses = patronConfig.meses || [1, 7]
  if (!meses.includes(mes)) return null
  const fecha = fechaSegura(anio, mes, patronConfig.dia || 20)
  return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: false }
}

// ─── PATRON_DIAS_CIERRE ───────────────────────────────────────────────────────
export const calcPatronDiasCierre = ({ anio, fechaCierreEjercicio, terminacion, patronConfig, tablaAfip, calendario }) => {
  if (!fechaCierreEjercicio) return null
  const [mesCierre, diaCierre] = fechaCierreEjercicio.split('-').map(Number)
  const offset = patronConfig.mesesDespues || 5

  // Intentar con calendario exacto (indexado por año fiscal + mes de cierre)
  if (patronConfig.tablaKey) {
    const diaExacto = calendario?.[patronConfig.tablaKey]?.[String(anio)]?.[String(mesCierre)]?.[String(terminacion)]
    if (diaExacto != null) {
      const mesVenc     = mesCierre + offset
      const anioVenc    = anio + Math.floor((mesVenc - 1) / 12)
      const mesVencNorm = ((mesVenc - 1) % 12) + 1
      const fecha = fechaSegura(anioVenc, mesVencNorm, Number(diaExacto))
      return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: false }
    }
  }

  // Fallback: día genérico de tablaAfip
  const fechaCierre = new Date(anio, mesCierre - 1, diaCierre)
  let fechaBase = addMonths(fechaCierre, offset)
  if (patronConfig.tablaKey && tablaAfip?.[patronConfig.tablaKey]) {
    const dia = tablaAfip[patronConfig.tablaKey][terminacion]
              ?? tablaAfip[patronConfig.tablaKey][String(terminacion)]
              ?? 20
    fechaBase = fechaSegura(getYear(fechaBase), getMonth(fechaBase) + 1, dia)
  }
  return { fecha: format(ajustarFinDeSemana(fechaBase), 'yyyy-MM-dd'), tentativo: true }
}

// Encuentra el grupo de CUIT al que pertenece un dígito (ej: digit=3, grupos=['0-1','2-3','4-5'] → '2-3')
const findGrupoForDigit = (grupos, digit) => {
  for (const grupo of grupos) {
    const parts = grupo.split('-').map(Number)
    if (parts.length === 2 && digit >= parts[0] && digit <= parts[1]) return grupo
    if (parts.length === 1 && digit === parts[0]) return grupo
  }
  return null
}

// ─── PATRON_FECHA_PROVINCIA ───────────────────────────────────────────────────
export const calcPatronFechaProvincia = ({ anio, mes, patronConfig, appConfig, terminacion }) => {
  // Normalizar provincia: usar la del patronConfig o, si está vacía, la primera provincia configurada
  let prov = (patronConfig.provincia || '').toLowerCase()
  if (!prov && appConfig?.configuracionProvincias) {
    const keys = Object.keys(appConfig.configuracionProvincias)
    if (keys.length === 1) prov = keys[0]
  }
  if (prov) {
    const grupos = appConfig?.configuracionProvincias?.[prov]?.grupos
    if (grupos && grupos.length > 0) {
      const grupo = findGrupoForDigit(grupos, terminacion ?? 0)
      if (grupo) {
        const diaManual = appConfig?.tablaFechasProvincia?.[prov]?.[String(anio)]?.[String(mes)]?.[grupo]
        console.debug('[IIBB] prov=%s anio=%s mes=%s term=%s grupo=%s diaManual=%s', prov, anio, mes, terminacion, grupo, diaManual)
        if (diaManual != null) {
          const fecha = fechaSegura(anio, mes, Number(diaManual))
          return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: false }
        }
      }
    }
  }
  // Sin dato en calendario → tentativo con día fijo del patronConfig
  const fecha = fechaSegura(anio, mes, patronConfig.dia || 15)
  return { fecha: format(ajustarFinDeSemana(fecha), 'yyyy-MM-dd'), tentativo: true }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
// Retorna siempre { fecha: 'YYYY-MM-DD', tentativo: boolean } o null.
// `patronConfig` = configuración específica del tipo de obligación (tablaKey, mesOffset, etc.)
// `appConfig`    = configuración global de la app (tablaAfip, tablaAfipCalendario)

export const calcularFechaVencimiento = ({ patron, anio, mes, cliente, patronConfig, appConfig, obligacionId }) => {
  const term        = terminacionCuit(cliente?.cuit)
  const fechaCierre = cliente?.fechaCierreEjercicio
  const tablaAfip   = appConfig?.tablaAfip || {}
  const calendario  = appConfig?.tablaAfipCalendario || {}

  switch (patron) {
    case PATRONES.PATRON_CUIT:
      return calcPatronCuit({ anio, mes, terminacion: term, patronConfig, tablaAfip, calendario })
    case PATRONES.PATRON_DIA_FIJO:
      return calcPatronDiaFijo({ anio, mes, patronConfig, appConfig, obligacionId })
    case PATRONES.PATRON_SEMESTRAL_FIJO:
      return calcPatronSemestralFijo({ anio, mes, patronConfig })
    case PATRONES.PATRON_DIAS_CIERRE:
      return calcPatronDiasCierre({ anio, fechaCierreEjercicio: fechaCierre, terminacion: term, patronConfig, tablaAfip, calendario })
    case PATRONES.PATRON_FECHA_PROVINCIA:
      return calcPatronFechaProvincia({ anio, mes, patronConfig, appConfig, terminacion: term })
    default:
      return null
  }
}
