import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clientes from './pages/Clientes.jsx'
import ClienteForm from './pages/ClienteForm.jsx'
import ClienteDetalle from './pages/ClienteDetalle.jsx'
import Vencimientos from './pages/Vencimientos.jsx'
import Historial from './pages/Historial.jsx'
import Configuracion from './pages/Configuracion.jsx'
import Calendario from './pages/Calendario.jsx'
import Estadisticas from './pages/Estadisticas.jsx'
import Notificaciones from './pages/Notificaciones.jsx'
import CalculadoraMonotributo from './pages/CalculadoraMonotributo.jsx'
import Comprobantes from './pages/Comprobantes.jsx'
import Inscripciones from './pages/Inscripciones.jsx'
import Login from './pages/Login.jsx'
import SetupPassword from './pages/SetupPassword.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import { initSeed } from './db/seed.js'

function Inner() {
  return (
    <Layout>
      <Routes>
        <Route path="/"                       element={<Dashboard />} />
        <Route path="/clientes"               element={<Clientes />} />
        <Route path="/clientes/nuevo"         element={<ClienteForm />} />
        <Route path="/clientes/:id"           element={<ClienteDetalle />} />
        <Route path="/clientes/:id/editar"    element={<ClienteForm />} />
        <Route path="/vencimientos"           element={<Vencimientos />} />
        <Route path="/calendario"             element={<Calendario />} />
        <Route path="/estadisticas"           element={<Estadisticas />} />
        <Route path="/historial"              element={<Historial />} />
        <Route path="/notificaciones"         element={<Notificaciones />} />
        <Route path="/calculadora"            element={<CalculadoraMonotributo />} />
        <Route path="/comprobantes"           element={<Comprobantes />} />
        <Route path="/inscripciones"          element={<Inscripciones />} />
        <Route path="/configuracion"          element={<Configuracion />} />
      </Routes>
    </Layout>
  )
}

function AppGate() {
  const { autenticado, passwordConfigurada } = useAuth()
  useEffect(() => { initSeed() }, [])
  if (!passwordConfigurada) return <SetupPassword />
  if (!autenticado)         return <Login />
  return <AppProvider><Inner /></AppProvider>
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}
