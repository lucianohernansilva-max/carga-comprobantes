import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getClientes, getVencimientos, getTiposObligacion, getObligacionesCliente,
  getConfig, subscribe, actualizarEstadosVencidos, limpiarIIBBMonotributistas,
  limpiarVencimientosNoCorrespondientes, limpiarVencimientosMonotributo,
  limpiarVencimientosIVA, getInscripciones,
} from '../db/store.js'
import { sincronizarTiposPredefinidos } from '../db/seed.js'
import { asegurarObligacionesTodos, generarVencimientosTodos, recalcularFechasVencimientos } from '../db/generador.js'

const AppContext = createContext(null)

export const AppProvider = ({ children }) => {
  const [clientes,        setClientes]        = useState([])
  const [vencimientos,    setVencimientos]    = useState([])
  const [tipos,           setTipos]           = useState([])
  const [obligaciones,    setObligaciones]    = useState([])
  const [config,          setConfig]          = useState({})
  const [inscripciones,   setInscripciones]   = useState([])

  const refresh = useCallback(() => {
    actualizarEstadosVencidos()
    setClientes(getClientes())
    setVencimientos(getVencimientos())
    setTipos(getTiposObligacion())
    setObligaciones(getObligacionesCliente())
    setConfig(getConfig())
    setInscripciones(getInscripciones())
  }, [])

  useEffect(() => {
    // ── Migración de datos ────────────────────────────────────────────────────
    sincronizarTiposPredefinidos()            // asegura condicionesFiscales en todos los tipos
    limpiarIIBBMonotributistas()              // elimina IIBB Local de monotributistas
    limpiarVencimientosNoCorrespondientes()   // elimina vencimientos de tipo incorrecto para la condición fiscal

    // ── Garantizar obligaciones core + regenerar vencimientos ─────────────────
    const clientes = getClientes()
    asegurarObligacionesTodos()              // iva-mensual para RI, monotributo-cuota para monotributistas, etc.
    limpiarVencimientosMonotributo()         // borra monotributo pendientes/vencidos para regenerar con fecha correcta
    limpiarVencimientosIVA()                 // borra IVA pendientes/vencidos para regenerar con datos correctos post-sincronización
    generarVencimientosTodos(clientes)       // genera vencimientos faltantes para todos los clientes
    recalcularFechasVencimientos()           // recalcula fechas de vencimientos no ajustados manualmente

    // ── Debug: confirmar resultados ───────────────────────────────────────────
    // IVA usa mesOffset=1: el vencimiento del período Mayo cae en Junio.
    // Por eso filtramos por FECHA (2026-06-xx), no por periodo ('2026-05').
    const vencimientosActuales = getVencimientos()
    const mesActualStr = new Date().toISOString().slice(0, 7)  // 'YYYY-MM'
    const monotributoMes = vencimientosActuales.filter(v =>
      v.tipoObligacionId === 'monotributo-cuota' && v.fecha?.startsWith(mesActualStr)
    )
    const ivaMes = vencimientosActuales.filter(v =>
      v.tipoObligacionId === 'iva-mensual' && v.fecha?.startsWith(mesActualStr)
    )
    console.info('[Init] Monotributo: %d clientes con vencimiento en %s (fecha: %s)',
      monotributoMes.length, mesActualStr,
      monotributoMes[0]?.fecha ?? 'sin fecha'
    )
    console.info('[Init] IVA: %d clientes con vencimiento en %s (fecha: %s)',
      ivaMes.length, mesActualStr,
      ivaMes[0]?.fecha ?? 'sin fecha'
    )

    refresh()
    const unsub = subscribe(refresh)
    return unsub
  }, [refresh])

  // Enriquecer vencimientos con datos relacionados para uso en UI
  const vencimientosEnriquecidos = vencimientos.map(v => ({
    ...v,
    cliente: clientes.find(c => c.id === v.clienteId),
    tipo:    tipos.find(t => t.id === v.tipoObligacionId),
  })).filter(v => v.cliente && v.tipo)

  return (
    <AppContext.Provider value={{ clientes, vencimientos: vencimientosEnriquecidos, tipos, obligaciones, config, inscripciones, refresh }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider')
  return ctx
}
