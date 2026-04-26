import { NavLink, useNavigate } from 'react-router-dom'
import { Home, History, Camera } from 'lucide-react'

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} />
        <span>Inicio</span>
      </NavLink>

      <div className="nav-capture">
        <button
          className="nav-capture-btn"
          onClick={() => navigate('/capturar')}
          aria-label="Nuevo comprobante"
        >
          <Camera size={22} />
        </button>
      </div>

      <NavLink to="/historial" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <History size={20} />
        <span>Historial</span>
      </NavLink>
    </nav>
  )
}
