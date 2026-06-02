import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getClientes, getVencimientos, getTiposObligacion, getObligacionesCliente,
  getConfig, subscribe, actualizarEstadosVencidos, limpiarIIBBMonotributistas,
  getInscripciones,
} from '../db/store.js'

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
    limpiarIIBBMonotributistas()  // migración: elimina IIBB Local de monotributistas
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
