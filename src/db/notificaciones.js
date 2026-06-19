// Generación de mensajes de recordatorio para WhatsApp y Email.
// Sin backend: usa wa.me y mailto: para abrir la app del dispositivo.
// Con backend (Cloudflare Tunnel + Node): se puede extender a envío automático.

import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// Formatea número de WhatsApp: elimina todo menos dígitos, agrega 549 si es AR
export const normalizarWhatsapp = (numero) => {
  if (!numero) return ''
  const digits = String(numero).replace(/\D/g, '')
  // Si empieza con 0 (ej: 011...) → quitar el 0 y agregar 54
  if (digits.startsWith('0')) return '54' + digits.slice(1)
  // Si ya tiene código de país
  if (digits.startsWith('54')) return digits
  // Asumir Argentina
  return '54' + digits
}

// Construye el mensaje de WhatsApp para un vencimiento próximo
export const buildWhatsappMsg = ({ cliente, tipo, vencimiento, nombreEstudio }) => {
  const fecha = format(parseISO(vencimiento.fecha), "d 'de' MMMM yyyy", { locale: es })
  const dias  = differenceInDays(parseISO(vencimiento.fecha), new Date())
  const diasStr = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`

  const lines = [
    `Hola ${cliente.nombre.split(' ')[0]},`,
    ``,
    `Le recuerdo que el vencimiento de *${tipo.nombre}* (período ${vencimiento.periodo}) opera *${diasStr}*, el ${fecha}.`,
    ``,
    `Por favor coordine la documentación necesaria con anticipación.`,
    ``,
    `Saludos,`,
    nombreEstudio || 'El Estudio Contable',
  ]
  return lines.join('\n')
}

// Devuelve una URL wa.me lista para abrir
export const whatsappUrl = ({ cliente, tipo, vencimiento, nombreEstudio }) => {
  const numero = normalizarWhatsapp(cliente.whatsapp)
  if (!numero) return null
  const msg = buildWhatsappMsg({ cliente, tipo, vencimiento, nombreEstudio })
  return `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`
}

// Construye el asunto y cuerpo del email de recordatorio
export const buildEmailMsg = ({ cliente, tipo, vencimiento, nombreEstudio }) => {
  const fecha = format(parseISO(vencimiento.fecha), "d 'de' MMMM yyyy", { locale: es })
  const dias  = differenceInDays(parseISO(vencimiento.fecha), new Date())
  const diasStr = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`

  const asunto = `Recordatorio: ${tipo.nombre} vence ${diasStr} — ${fecha}`
  const cuerpo = [
    `Estimado/a ${cliente.nombre},`,
    ``,
    `Le informamos que el vencimiento correspondiente a "${tipo.nombre}" (período ${vencimiento.periodo}) opera ${diasStr}, el día ${fecha}.`,
    ``,
    `Le solicitamos que coordine la documentación necesaria con anticipación para poder cumplir con la presentación y/o pago en término.`,
    ``,
    `Ante cualquier consulta, no dude en comunicarse con el estudio.`,
    ``,
    `Saludos cordiales,`,
    `${nombreEstudio || 'Estudio Contable'}`,
  ].join('\n')

  return { asunto, cuerpo }
}

// Devuelve una URL mailto: lista para abrir el cliente de email
export const emailUrl = ({ cliente, tipo, vencimiento, nombreEstudio }) => {
  if (!cliente.email) return null
  const { asunto, cuerpo } = buildEmailMsg({ cliente, tipo, vencimiento, nombreEstudio })
  return `mailto:${encodeURIComponent(cliente.email)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`
}
