import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarClock, History, Settings, LogOut } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { differenceInDays, parseISO } from 'date-fns'

const NAV = [
  { to: '/',              label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/clientes',      label: 'Clientes',     Icon: Users },
  { to: '/vencimientos',  label: 'Vencimientos', Icon: CalendarClock },
  { to: '/historial',     label: 'Historial',    Icon: History },
  { to: '/configuracion', label: 'Configuración',Icon: Settings },
]

export default function Layout({ children }) {
  const { vencimientos } = useApp()
  const { onLogout }     = useAuth()
  const hoy = new Date().toISOString().slice(0, 10)
  const urgentes = vencimientos.filter(v =>
    v.estado === 'pendiente' && v.fecha <= hoy
  ).length
  const proximos7 = vencimientos.filter(v => {
    if (v.estado !== 'pendiente') return false
    const dias = differenceInDays(parseISO(v.fecha), new Date())
    return dias >= 0 && dias <= 7
  }).length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col shrink-0 shadow-sm">
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <CalendarClock size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary leading-tight">VencimientosFi</p>
              <p className="text-xs text-gray-400 leading-tight">Gestión impositiva</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {to === '/vencimientos' && urgentes > 0 && (
                <span className="ml-auto bg-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {urgentes}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {proximos7 > 0 && (
          <div className="mx-3 mb-2 p-3 bg-warning/10 rounded-lg border border-warning/30">
            <p className="text-xs font-semibold text-warning">
              ⚠ {proximos7} vencimiento{proximos7 > 1 ? 's' : ''} en 7 días
            </p>
          </div>
        )}

        {/* Cerrar sesión */}
        <div className="px-2 pb-3">
          <button
            onClick={() => { if (confirm('¿Cerrar sesión?')) onLogout() }}
            className="sidebar-item w-full text-gray-400 hover:text-danger hover:bg-red-50"
          >
            <LogOut size={15} />
            <span className="text-xs">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
