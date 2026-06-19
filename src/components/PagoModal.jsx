import { useState } from 'react'
import { X, DollarSign } from 'lucide-react'
import { saveVencimiento } from '../db/store.js'

export default function PagoModal({ v, onClose, onSave }) {
  const [importe,           setImporte]           = useState(v.pago?.importe ?? '')
  const [fechaPago,         setFechaPago]         = useState(v.pago?.fechaPago || new Date().toISOString().slice(0, 10))
  const [numeroTransaccion, setNumeroTransaccion] = useState(v.pago?.numeroTransaccion ?? '')
  const [notas,             setNotas]             = useState(v.pago?.notas ?? '')

  const confirmar = () => {
    saveVencimiento({
      ...v,
      estado: 'pagado',
      pago: {
        importe:           importe !== '' ? Number(importe) : null,
        fechaPago,
        numeroTransaccion: numeroTransaccion || null,
        notas:             notas || null,
      },
    })
    onSave?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-5 w-80 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={14} className="text-green-700" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Registrar pago</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg px-3 py-2">
          <span className="font-semibold text-gray-700">{v.tipo?.nombre}</span>
          <span className="text-gray-400"> · </span>
          {v.cliente?.nombre}
        </p>

        <div className="space-y-3">
          <div>
            <label className="form-label">Importe pagado ($)</label>
            <input type="number" min="0" step="0.01" className="form-input"
              placeholder="0.00" value={importe}
              onChange={e => setImporte(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="form-label">Fecha de pago</label>
            <input type="date" className="form-input"
              value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
          </div>
          <div>
            <label className="form-label">
              N° de transacción / comprobante
              <span className="font-normal text-gray-400 ml-1">(opcional)</span>
            </label>
            <input type="text" className="form-input" placeholder="Ej: 123456789"
              value={numeroTransaccion} onChange={e => setNumeroTransaccion(e.target.value)} />
          </div>
          <div>
            <label className="form-label">
              Notas
              <span className="font-normal text-gray-400 ml-1">(opcional)</span>
            </label>
            <textarea className="form-textarea" rows={2} placeholder="Observaciones..."
              value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}    className="btn btn-secondary flex-1 btn-sm">Cancelar</button>
          <button onClick={confirmar}  className="btn btn-success  flex-1 btn-sm">Confirmar pago</button>
        </div>
      </div>
    </div>
  )
}
