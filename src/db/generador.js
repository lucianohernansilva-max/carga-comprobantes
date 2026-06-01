// Generador automático de vencimientos.
// Para cada obligación activa de un cliente, genera instancias para N meses.

import { addMonths, format, getMonth, getYear } from 'date-fns'
import { calcularFechaVencimiento, PATRONES } from './fechas.js'
import { getConfig, getVencimientos, bulkSaveVencimientos, getObligacionesCliente, getTipoObligacion } from './store.js'

// Genera vencimientos para un cliente desde hoy hasta horizonte meses
export const generarVencimientosCliente = (cliente, { horizonte = 12, desde } = {}) => {
  const config    = getConfig()
  const tablaAfip = config.tablaAfip
  const now       = desde ? new Date(desde) : new Date()
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
        const fv = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes, cliente, config: configEfectivo, tablaAfip,
        })
        if (!fv) continue
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
        })
      }
    }

    // Para semestral: iterar mes a mes, solo genera cuando corresponde
    if (tipo.patron === PATRONES.PATRON_SEMESTRAL_FIJO) {
      for (let i = 0; i < horizonte; i++) {
        const fecha = addMonths(now, i)
        const anio  = getYear(fecha)
        const mes   = getMonth(fecha) + 1
        const fv = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes, cliente, config: configEfectivo, tablaAfip,
        })
        if (!fv) continue
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
        })
      }
    }

    // Para DDJJ anual (Ganancias PJ, Bienes Personales):
    // Solo generar una vez para el ejercicio que corresponde
    if (tipo.patron === PATRONES.PATRON_DIAS_CIERRE) {
      // Generar para los próximos 2 ejercicios
      for (let y = 0; y <= 1; y++) {
        const anio = getYear(now) + y
        const fv = calcularFechaVencimiento({
          patron: tipo.patron, anio, mes: 1, cliente, config: configEfectivo, tablaAfip,
        })
        if (!fv) continue
        nuevos.push({
          clienteId:          cliente.id,
          tipoObligacionId:   tipo.id,
          obligacionClienteId: obl.id,
          fecha:              fv,
          periodo:            `${anio}`,
          estado:             'pendiente',
          notas:              '',
          silenciado:         false,
          ajustadoManualmente: false,
        })
      }
    }
  }

  return bulkSaveVencimientos(nuevos)
}

export const generarVencimientosTodos = (clientes) => {
  for (const c of clientes) generarVencimientosCliente(c)
}
