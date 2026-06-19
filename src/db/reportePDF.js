// Generación de reportes PDF con jsPDF + jspdf-autotable.
// Todo client-side, sin servidor.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_LABELS = {
  pendiente:  'Pendiente',
  en_proceso: 'En proceso',
  presentado: 'Presentado',
  pagado:     'Pagado',
  no_aplica:  'No aplica',
  vencido:    'Vencido',
}

const ESTADO_COLORS = {
  pendiente:  [253, 224, 71],    // amarillo
  en_proceso: [147, 197, 253],   // azul
  presentado: [196, 181, 253],   // púrpura
  pagado:     [134, 239, 172],   // verde
  no_aplica:  [209, 213, 219],   // gris
  vencido:    [252, 165, 165],   // rojo
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export const generarReporteMensual = ({ vencimientos, mes, anio, config }) => {
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const mesStr = MESES[mes]
  const estudio = config?.estudio?.nombre || 'Estudio Contable'
  const cuitEstudio = config?.estudio?.cuit || ''

  // ── Encabezado ────────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 95)           // primary
  doc.rect(0, 0, 297, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(estudio, 14, 10)
  if (cuitEstudio) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`CUIT: ${cuitEstudio}`, 14, 16)
  }
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(`Vencimientos Impositivos — ${mesStr} ${anio}`, 297 / 2, 12, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 283, 10, { align: 'right' })

  // ── Resumen estadístico ───────────────────────────────────────────────────
  doc.setTextColor(30, 58, 95)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumen del período', 14, 32)

  const totales = {
    total:     vencimientos.length,
    pagado:    vencimientos.filter(v => v.estado === 'pagado').length,
    presentado:vencimientos.filter(v => v.estado === 'presentado').length,
    pendiente: vencimientos.filter(v => v.estado === 'pendiente').length,
    vencido:   vencimientos.filter(v => v.estado === 'vencido').length,
  }

  const stats = [
    ['Total',       String(totales.total),      [229, 231, 235]],
    ['Pagados',     String(totales.pagado),      [134, 239, 172]],
    ['Presentados', String(totales.presentado),  [196, 181, 253]],
    ['Pendientes',  String(totales.pendiente),   [253, 224, 71]],
    ['Vencidos',    String(totales.vencido),     [252, 165, 165]],
  ]

  stats.forEach(([label, val, color], i) => {
    const x = 14 + i * 52
    doc.setFillColor(...color)
    doc.roundedRect(x, 35, 48, 16, 2, 2, 'F')
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(val, x + 24, 44, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 24, 49, { align: 'center' })
  })

  // ── Tabla principal ───────────────────────────────────────────────────────
  const rows = vencimientos
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(v => [
      format(parseISO(v.fecha), 'dd/MM/yyyy'),
      v.cliente?.nombre || '—',
      v.cliente?.cuit   || '—',
      v.tipo?.nombre    || '—',
      v.periodo,
      ESTADO_LABELS[v.estado] || v.estado,
      v.notas || '',
    ])

  autoTable(doc, {
    startY: 57,
    head: [['Fecha', 'Cliente', 'CUIT', 'Obligación', 'Período', 'Estado', 'Notas']],
    body: rows,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center' },
      1: { cellWidth: 52 },
      2: { cellWidth: 30 },
      3: { cellWidth: 55 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 'auto' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const estado = Object.keys(ESTADO_LABELS).find(k => ESTADO_LABELS[k] === data.cell.text[0])
        if (estado && ESTADO_COLORS[estado]) {
          data.cell.styles.fillColor = ESTADO_COLORS[estado]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Pie de página ─────────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(`${estudio} — ${mesStr} ${anio} — Pág. ${p} de ${totalPages}`, 148.5, 205, { align: 'center' })
    doc.setDrawColor(200)
    doc.line(14, 202, 283, 202)
  }

  doc.save(`Vencimientos_${mesStr}_${anio}.pdf`)
}
