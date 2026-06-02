// Generador automático de vencimientos.
// Para cada obligación activa de un cliente, genera instancias para N meses.

import { addMonths, format, getMonth, getYear } from 'date-fns'
import { calcularFechaVencimiento, PATRONES } from './fechas.js'
import { ajustarDiaHabil } from './feriados.js'
import { getConfig, getVencimientos, bulkSaveVencimientos, getObligacionesCliente, getTipoObligacion, getClientes, updateVencimientosFechas } from './store.js'

// Genera vencimientos para un cliente desde hoy hasta horizonte meses
export const generarVencimientosCliente = (cliente, { horizonte = 12, desde } = {}) => {
  const config = getConfig()
  const now    = desde ? new Date(desde) : new Date()
  const obligaciones = getObligacionesCliente(cliente.id).filter(o => o.activa)

  const nuevos = []

  for (const obl of obligaciones) {
    const tipo = getTipoObligacion(obl.tipoObligacionId)
    if (!tipo || !tipo.activo) continue

    const configEfectivo = { ...tipo.configuracion, ...(obl.configuracionExtra || {}) }

    // Para patrones mensuales: iterar mes a mes
    if ([PATRONES.PATRON_CUIT, PATRONES.PATRON_DIA_FIJO, PATRONES.PATRON_FECHA_PROVINCIA].includes(tipo.patron)) {
      for (let i = 0; i < horizonte; i++) {
        const fecha = addMonths(now, i)
        const anio  = getYear(fecha)
        const mes   = getMonth(fecha) + 1
        // mesesAplicables restringe la generación a meses específicos (ej: DDJJ anual solo en mes de cierre)
        if (configEfectivo.mesesAplicables && !configEfectivo.mesesAplicables.includes(mes)) continue
        const result = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes, cliente, patronConfig: configEfectivo, appConfig: config, obligacionId: tipo.id,
        })
        if (!result) continue
        const fv = ajustarDiaHabil(result.fecha)
        const periodo = `${anio}-${String(mes).padStart(2, '0')}`
        nuevos.push({
          clienteId:          cliente.id,
          tipoObligacionId:   tipo.id,
          obligacionClienteId: obl.id,
          fecha:              fv,
          periodo,
          estado:             'pendiente',
          notas:              '',
          silenciado:         false,
          ajustadoManualmente: false,
          tentativo:          result.tentativo,
        })
      }
    }

    // Para semestral: iterar mes a mes, solo genera cuando corresponde
    if (tipo.patron === PATRONES.PATRON_SEMESTRAL_FIJO) {
      for (let i = 0; i < horizonte; i++) {
        const fecha = addMonths(now, i)
        const anio  = getYear(fecha)
        const mes   = getMonth(fecha) + 1
        const result = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes, cliente, patronConfig: configEfectivo, appConfig: config, obligacionId: tipo.id,
        })
        if (!result) continue
        const fv = ajustarDiaHabil(result.fecha)
        const periodo = `${anio}-${String(mes).padStart(2, '0')}`
        nuevos.push({
          clienteId:          cliente.id,
          tipoObligacionId:   tipo.id,
          obligacionClienteId: obl.id,
          fecha:              fv,
          periodo,
          estado:             'pendiente',
          notas:              '',
          silenciado:         false,
          ajustadoManualmente: false,
          tentativo:          result.tentativo,
        })
      }
    }

    // Para DDJJ anual (Ganancias PJ, Bienes Personales):
    // Solo generar una vez para el ejercicio que corresponde
    if (tipo.patron === PATRONES.PATRON_DIAS_CIERRE) {
      for (let y = 0; y <= 1; y++) {
        const anio = getYear(now) + y
        const result = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes: 1, cliente, patronConfig: configEfectivo, appConfig: config,
        })
        if (!result) continue
        nuevos.push({
          clienteId:          cliente.id,
          tipoObligacionId:   tipo.id,
          obligacionClienteId: obl.id,
          fecha:              result.fecha,
          periodo:            `${anio}`,
          estado:             'pendiente',
          notas:              '',
          silenciado:         false,
          ajustadoManualmente: false,
          tentativo:          result.tentativo,
        })
      }
    }
  }

  return bulkSaveVencimientos(nuevos)
}

export const generarVencimientosTodos = (clientes) => {
  for (const c of clientes) generarVencimientosCliente(c)
}

// Recalcula las fechas de vencimientos existentes (no ajustados manualmente) según el calendario actual.
// Devuelve la cantidad de vencimientos actualizados.
export const recalcularFechasVencimientos = () => {
  const config    = getConfig()
  const clientes  = getClientes()
  const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c]))
  const oblAll    = getObligacionesCliente()
  const oblMap    = Object.fromEntries(oblAll.map(o => [o.id, o]))

  const updates = []

  for (const v of getVencimientos()) {
    if (v.ajustadoManualmente) continue
    if (['pagado', 'presentado', 'no_aplica'].includes(v.estado)) continue

    const tipo    = getTipoObligacion(v.tipoObligacionId)
    const obl     = oblMap[v.obligacionClienteId]
    const cliente = clienteMap[v.clienteId]
    if (!tipo || !obl || !cliente) continue

    const configEfectivo = { ...tipo.configuracion, ...(obl.configuracionExtra || {}) }

    let anio, mes
    if (v.periodo && v.periodo.includes('-')) {
      const p = v.periodo.split('-')
      anio = Number(p[0]); mes = Number(p[1])
    } else {
      anio = Number(v.periodo); mes = 1
    }

    const result = calcularFechaVencimiento({
      patron: tipo.patron, anio, mes, cliente,
      patronConfig: configEfectivo, appConfig: config, obligacionId: tipo.id,
    })
    if (!result) continue

    const nuevaFecha = ajustarDiaHabil(result.fecha)
    if (nuevaFecha !== v.fecha || result.tentativo !== v.tentativo) {
      updates.push({ id: v.id, fecha: nuevaFecha, tentativo: result.tentativo })
    }
  }

  if (updates.length > 0) updateVencimientosFechas(updates)
  return updates.length
}
