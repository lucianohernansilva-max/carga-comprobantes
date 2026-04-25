export function formatCurrency(value) {
  const num = parseFloat(value) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function formatCUIT(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

export function formatComprobanteNum(pv, num) {
  const pvStr = String(pv || '').padStart(4, '0')
  const numStr = String(num || '').padStart(8, '0')
  return `${pvStr}-${numStr}`
}

export const TIPOS_COMPROBANTE = [
  { value: 'FACTURA_A', label: 'Factura A', badge: 'FAC A', type: 'a' },
  { value: 'FACTURA_B', label: 'Factura B', badge: 'FAC B', type: 'b' },
  { value: 'FACTURA_C', label: 'Factura C', badge: 'FAC C', type: 'c' },
  { value: 'FACTURA_M', label: 'Factura M', badge: 'FAC M', type: 'm' },
  { value: 'NC_A', label: 'Nota de Crédito A', badge: 'NC A', type: 'a' },
  { value: 'NC_B', label: 'Nota de Crédito B', badge: 'NC B', type: 'b' },
  { value: 'NC_C', label: 'Nota de Crédito C', badge: 'NC C', type: 'c' },
  { value: 'ND_A', label: 'Nota de Débito A', badge: 'ND A', type: 'a' },
  { value: 'ND_B', label: 'Nota de Débito B', badge: 'ND B', type: 'b' },
  { value: 'ND_C', label: 'Nota de Débito C', badge: 'ND C', type: 'c' },
  { value: 'TICKET', label: 'Ticket', badge: 'TKT', type: 't' },
  { value: 'TICKET_FACTURA', label: 'Ticket Factura', badge: 'TK F', type: 't' },
  { value: 'REMITO', label: 'Remito', badge: 'REM', type: 't' },
]

export const IVA_ALICUOTAS = [
  { value: '0', label: '0% (Exento)' },
  { value: '10.5', label: '10.5%' },
  { value: '21', label: '21%' },
  { value: '27', label: '27%' },
]

export function getTipoInfo(value) {
  return TIPOS_COMPROBANTE.find(t => t.value === value) || { badge: '?', type: 't' }
}

export function getBadgeClass(type) {
  const map = { a: 'badge-a', b: 'badge-b', c: 'badge-c', m: 'badge-m', t: 'badge-t' }
  return map[type] || 'badge-t'
}
