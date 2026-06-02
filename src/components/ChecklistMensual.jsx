import { useState } from 'react'
import { Plus, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { getOrCreateChecklist, saveChecklist } from '../db/store.js'
import { format, addMonths, subMonths, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

function mesStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
function mesLabel(str) {
  const [y, m] = str.split('-').map(Number)
  return format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: es })
}

export default function ChecklistMensual({ clienteId, condicionFiscal }) {
  const [mesDate, setMesDate]   = useState(new Date())
  const mes                     = mesStr(mesDate)
  const [checklist, setChecklist] = useState(() => getOrCreateChecklist(clienteId, mes, condicionFiscal))
  const [nuevaTarea, setNuevaTarea] = useState('')

  const navMes = (delta) => {
    const nueva = delta > 0 ? addMonths(mesDate, 1) : subMonths(mesDate, 1)
    setMesDate(nueva)
    setChecklist(getOrCreateChecklist(clienteId, mesStr(nueva), condicionFiscal))
  }

  const toggle = (itemId) => {
    const updated = {
      ...checklist,
      items: checklist.items.map(i => i.id === itemId ? { ...i, completado: !i.completado } : i),
    }
    setChecklist(saveChecklist(updated))
  }

  const agregarTarea = () => {
    if (!nuevaTarea.trim()) return
    const item = { id: crypto.randomUUID(), texto: nuevaTarea.trim(), completado: false, personalizado: true }
    setChecklist(saveChecklist({ ...checklist, items: [...checklist.items, item] }))
    setNuevaTarea('')
  }

  const eliminarTarea = (itemId) => {
    setChecklist(saveChecklist({ ...checklist, items: checklist.items.filter(i => i.id !== itemId) }))
  }

  const completados = checklist.items.filter(i => i.completado).length
  const total       = checklist.items.length
  const pct         = total === 0 ? 0 : Math.round((completados / total) * 100)
  const barColor    = pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning'

  return (
    <div className="card-padded space-y-3">
      {/* Header + nav de mes */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Checklist mensual</p>
        <div className="flex items-center gap-1">
          <button onClick={() => navMes(-1)} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <span className="text-xs font-semibold text-gray-700 capitalize w-28 text-center">
            {mesLabel(mes)}
          </span>
          <button onClick={() => navMes(1)} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{completados} de {total} tareas</span>
          <span className={pct === 100 ? 'text-success font-bold' : ''}>{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Lista de tareas */}
      <div className="space-y-1">
        {checklist.items.map(item => (
          <div
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors
              ${item.completado ? 'bg-green-50' : 'hover:bg-gray-50'}`}
          >
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
              ${item.completado ? 'bg-success border-success' : 'border-gray-300 group-hover:border-primary'}`}>
              {item.completado && <Check size={10} className="text-white" strokeWidth={3} />}
            </div>
            <span className={`text-sm flex-1 select-none
              ${item.completado ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {item.texto}
              {item.personalizado && <span className="ml-1 text-xs text-gray-300">(custom)</span>}
            </span>
            {item.personalizado && (
              <button
                onClick={e => { e.stopPropagation(); eliminarTarea(item.id) }}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-danger transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        {checklist.items.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Sin tareas — agregá una abajo</p>
        )}
      </div>

      {/* Agregar tarea personalizada */}
      <div className="flex gap-2 pt-1">
        <input
          className="form-input text-xs py-1.5 flex-1"
          value={nuevaTarea}
          onChange={e => setNuevaTarea(e.target.value)}
          placeholder="Agregar tarea personalizada…"
          onKeyDown={e => e.key === 'Enter' && agregarTarea()}
        />
        <button onClick={agregarTarea} className="btn btn-secondary btn-sm px-2" title="Agregar">
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}
