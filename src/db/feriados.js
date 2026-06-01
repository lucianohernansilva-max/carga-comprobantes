// Feriados nacionales argentinos + lógica de ajuste de fechas.
// La lista es editable desde Configuración y se persiste en localStorage.

import { addDays, parseISO, format, getYear } from 'date-fns'

// Feriados inamovibles (día y mes siempre iguales)
const FERIADOS_FIJOS_BASE = [
  { mes: 1,  dia: 1,  nombre: 'Año Nuevo' },
  { mes: 2,  dia: 3,  nombre: 'Carnaval' },           // aprox — varía cada año
  { mes: 2,  dia: 4,  nombre: 'Carnaval' },
  { mes: 3,  dia: 24, nombre: 'Día de la Memoria' },
  { mes: 4,  dia: 2,  nombre: 'Día del Veterano de Malvinas' },
  { mes: 5,  dia: 1,  nombre: 'Día del Trabajador' },
  { mes: 5,  dia: 25, nombre: 'Revolución de Mayo' },
  { mes: 6,  dia: 17, nombre: 'Paso a la Inmortalidad del Gral. Güemes' },
  { mes: 6,  dia: 20, nombre: 'Paso a la Inmortalidad del Gral. Belgrano' },
  { mes: 7,  dia: 9,  nombre: 'Día de la Independencia' },
  { mes: 8,  dia: 17, nombre: 'Paso a la Inmortalidad del Gral. San Martín' },
  { mes: 10, dia: 12, nombre: 'Día del Respeto a la Diversidad Cultural' },
  { mes: 11, dia: 20, nombre: 'Día de la Soberanía Nacional' },
  { mes: 12, dia: 8,  nombre: 'Inmaculada Concepción de María' },
  { mes: 12, dia: 25, nombre: 'Navidad' },
]

// Viernes Santo varía — fechas 2025 y 2026
const VIERNES_SANTO = {
  2025: '2025-04-18',
  2026: '2026-04-03',
  2027: '2027-03-26',
}

const STORAGE_KEY = 'vc_feriados_extra'

const loadFeriadosExtra = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

export const saveFeriadosExtra = (lista) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
}

export const getFeriadosExtra = () => loadFeriadosExtra()

// Genera el Set de fechas de feriado para un año dado (formato 'YYYY-MM-DD')
export const getFeriadosDelAnio = (anio) => {
  const fechas = new Set()

  // Fijos
  for (const f of FERIADOS_FIJOS_BASE) {
    const d = new Date(anio, f.mes - 1, f.dia)
    fechas.add(format(d, 'yyyy-MM-dd'))
  }

  // Viernes Santo
  if (VIERNES_SANTO[anio]) fechas.add(VIERNES_SANTO[anio])

  // Extra (cargados por el usuario)
  for (const f of loadFeriadosExtra()) {
    if (f.fecha?.startsWith(String(anio))) fechas.add(f.fecha)
  }

  return fechas
}

// Dado un string 'YYYY-MM-DD', si cae en feriado o fin de semana
// devuelve el día hábil anterior más próximo.
export const ajustarDiaHabil = (fechaStr) => {
  let d = parseISO(fechaStr)
  const anio = getYear(d)
  const feriados = getFeriadosDelAnio(anio)

  let intentos = 0
  while (intentos < 14) {
    const dow = d.getDay()           // 0=dom, 6=sab
    const fs  = format(d, 'yyyy-MM-dd')
    if (dow !== 0 && dow !== 6 && !feriados.has(fs)) return fs
    d = addDays(d, -1)
    intentos++
  }
  return fechaStr  // fallback: devuelve la fecha original
}

// Lista completa de feriados de un año para mostrar en UI
export const listarFeriadosAnio = (anio) => {
  const lista = []
  for (const f of FERIADOS_FIJOS_BASE) {
    lista.push({ fecha: format(new Date(anio, f.mes - 1, f.dia), 'yyyy-MM-dd'), nombre: f.nombre, tipo: 'nacional' })
  }
  if (VIERNES_SANTO[anio]) lista.push({ fecha: VIERNES_SANTO[anio], nombre: 'Viernes Santo', tipo: 'nacional' })
  for (const f of loadFeriadosExtra()) {
    if (f.fecha?.startsWith(String(anio))) lista.push({ ...f, tipo: 'extra' })
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
}
