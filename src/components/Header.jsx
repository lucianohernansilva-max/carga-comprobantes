import { FileText } from 'lucide-react'

export default function Header() {
  return (
    <header className="header">
      <div className="header-icon">
        <FileText size={18} />
      </div>
      <div>
        <h1>Comprobantes Fiscales</h1>
        <p className="header-subtitle">Argentina</p>
      </div>
    </header>
  )
}
