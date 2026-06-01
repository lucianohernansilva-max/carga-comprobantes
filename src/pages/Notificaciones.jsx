import { useState, useMemo } from 'react'
import { MessageCircle, Mail, Bell, Filter } from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useApp } from '../context/AppContext.jsx'
import { whatsappUrl, emailUrl } from '../db/notificaciones.js'

const DIAS_ALERTA_DEFAULT = [7, 3, 1]

export default function Notificaciones() {
  const { vencimientos, config }  = useApp()
  const [filtro, setFiltro]       = useState('todos')  // todos | whatsapp | email | sinContacto

  const diasAlerta = config.alertasDias || DIAS_ALERTA_DEFAULT
  const nombreEstudio = config.estudio?.nombre

  // Vencimientos próximos que requieren notificación
  const candidatos = useMemo(() => {
    const hoy = new Date().toISOString().slice(0,10)
    return vencimientos
      .filter(v => {
        if (!['pendiente','en_proceso'].includes(v.estado)) return false
        if (v.silenciado) return false
        const dias = differenceInDays(parseISO(v.fecha), new Date())
        // Incluir si cae en algún umbral de alerta o ya venció
        return dias <= Math.max(...diasAlerta) && dias >= -5
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [vencimientos, diasAlerta])

  const filtrados = candidatos.filter(v => {
    if (filtro === 'whatsapp')   return !!v.cliente?.whatsapp
    if (filtro === 'email')      return !!v.cliente?.email
    if (filtro === 'sinContacto')return !v.cliente?.whatsapp && !v.cliente?.email
    return true
  })

  const urgencyLabel = (fecha) => {
    const dias = differenceInDays(parseISO(fecha), new Date())
    if (dias < 0)  return { txt: `Vencido hace ${Math.abs(dias)}d`, cls: 'text-danger bg-red-50' }
    if (dias === 0) return { txt: 'Vence hoy',    cls: 'text-danger bg-red-50' }
    if (dias === 1) return { txt: 'Vence mañana', cls: 'text-danger bg-red-50' }
    if (dias <= 3)  return { txt: `${dias} días`,  cls: 'text-danger bg-red-50' }
    if (dias <= 7)  return { txt: `${dias} días`,  cls: 'text-warning bg-orange-50' }
    return { txt: `${dias} días`, cls: 'text-success bg-green-50' }
  }

  const conWA    = candidatos.filter(v => v.cliente?.whatsapp).length
  const conEmail = candidatos.filter(v => v.cliente?.email).length
  const sinCtc   = candidatos.filter(v => !v.cliente?.whatsapp && !v.cliente?.email).length

  return (
    <div className="p-5 max-w-3xl">
      <div className="flex items-center gap-2 mb-5">
        <Bell size={20} className="text-primary" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500">Enviá recordatorios a tus clientes</p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-gray-800">{candidatos.length}</p>
          <p className="text-xs text-gray-500">Total alertas</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success">{conWA}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><MessageCircle size={10}/> Con WhatsApp</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary">{conEmail}</p>
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1"><Mail size={10}/> Con email</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'todos',       label: `Todos (${candidatos.length})` },
          { key: 'whatsapp',    label: `WhatsApp (${conWA})` },
          { key: 'email',       label: `Email (${conEmail})` },
          { key: 'sinContacto', label: `Sin contacto (${sinCtc})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filtro === key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sinCtc > 0 && filtro === 'todos' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-warning/30 rounded-xl text-xs text-warning font-medium">
          ⚠ {sinCtc} cliente{sinCtc > 1 ? 's' : ''} sin datos de contacto. Agregá WhatsApp/email desde la ficha del cliente.
        </div>
      )}

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">No hay alertas en este filtro</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(v => {
            const urg    = urgencyLabel(v.fecha)
            const waUrl  = whatsappUrl({ cliente: v.cliente, tipo: v.tipo, vencimiento: v, nombreEstudio })
            const mailUrl = emailUrl({ cliente: v.cliente, tipo: v.tipo, vencimiento: v, nombreEstudio })

            return (
              <div key={v.id} className="card px-4 py-3 flex items-center gap-3">
                {/* Urgencia */}
                <div className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold min-w-[70px] text-center ${urg.cls}`}>
                  {urg.txt}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{v.tipo?.nombre}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {v.cliente?.nombre} · {format(parseISO(v.fecha), "d MMM", { locale: es })}
                  </p>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Enviar por WhatsApp"
                      className="btn btn-sm bg-green-500 text-white hover:bg-green-600 px-2"
                    >
                      <MessageCircle size={14} />
                    </a>
                  ) : (
                    <button disabled title="Sin WhatsApp" className="btn btn-sm bg-gray-100 text-gray-300 px-2 cursor-not-allowed">
                      <MessageCircle size={14} />
                    </button>
                  )}
                  {mailUrl ? (
                    <a
                      href={mailUrl}
                      title="Enviar por email"
                      className="btn btn-sm btn-primary px-2"
                    >
                      <Mail size={14} />
                    </a>
                  ) : (
                    <button disabled title="Sin email" className="btn btn-sm bg-gray-100 text-gray-300 px-2 cursor-not-allowed">
                      <Mail size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-primary/20 rounded-xl text-xs text-gray-600">
        <strong className="text-primary">¿Cómo funciona?</strong> Al hacer clic en WhatsApp o Email se abre la app con el mensaje prellenado.
        Para envíos automáticos programados, activá el servidor local con Cloudflare Tunnel (ver instrucciones en README).
        Agregá el número de WhatsApp y email de cada cliente desde su ficha de edición.
      </div>
    </div>
  )
}
