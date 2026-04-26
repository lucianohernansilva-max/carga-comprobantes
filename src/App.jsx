import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Home from './pages/Home'
import Capture from './pages/Capture'
import History from './pages/History'
import ReceiptDetail from './pages/ReceiptDetail'
import BottomNav from './components/BottomNav'

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/capturar" element={<Capture />} />
          <Route path="/historial" element={<History />} />
          <Route path="/comprobante/:id" element={<ReceiptDetail />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
