const LABELS = {
  pendiente:   'Pendiente',
  en_proceso:  'En proceso',
  presentado:  'Presentado',
  pagado:      'Pagado',
  no_aplica:   'No aplica',
  vencido:     'Vencido',
}

export default function EstadoBadge({ estado }) {
  return (
    <span className={`badge badge-${estado}`}>
      {LABELS[estado] || estado}
    </span>
  )
}
