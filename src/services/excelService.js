import * as XLSX from 'xlsx'

const HEADERS = [
  'CUIT',
  'Razón Social',
  'Fecha',
  'Tipo',
  'N° Comprobante',
  'Importe Total',
  'IVA',
  'Observaciones',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildFilename() {
  const now = new Date()
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `comprobantes_${date}_${time}.xlsx`
}

export function exportToExcel(receipts) {
  const wb = XLSX.utils.book_new()

  const rows = receipts.map((r) => [
    r.cuit ?? '',
    r.razon_social ?? '',
    r.fecha ?? '',
    r.tipo_comprobante ?? '',
    r.numero_comprobante ?? '',
    r.importe_total != null ? Number(r.importe_total) : '',
    r.iva_discriminado != null ? Number(r.iva_discriminado) : '',
    r.observaciones ?? '',
  ])

  const totalImporte = receipts.reduce((s, r) => s + (Number(r.importe_total) || 0), 0)
  const totalIva = receipts.reduce((s, r) => s + (Number(r.iva_discriminado) || 0), 0)

  const totalRow = ['', '', '', '', 'TOTAL', totalImporte, totalIva || '', '']

  const wsData = [HEADERS, ...rows, totalRow]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Column widths
  ws['!cols'] = [
    { wch: 14 }, // CUIT
    { wch: 30 }, // Razón Social
    { wch: 12 }, // Fecha
    { wch: 6 },  // Tipo
    { wch: 18 }, // N° Comprobante
    { wch: 14 }, // Importe Total
    { wch: 12 }, // IVA
    { wch: 25 }, // Observaciones
  ]

  // Header row bold
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'DBEAFE' } } }
  HEADERS.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i })
    if (ws[cellRef]) ws[cellRef].s = headerStyle
  })

  // Total row bold
  const totalStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'FEF9C3' } } }
  HEADERS.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: wsData.length - 1, c: i })
    if (ws[cellRef]) ws[cellRef].s = totalStyle
  })

  // Numeric format for importe and IVA columns (F and G = indices 5 and 6)
  const numFmt = '#,##0.00'
  for (let r = 1; r < wsData.length; r++) {
    ;[5, 6].forEach((c) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      if (ws[ref] && typeof ws[ref].v === 'number') {
        ws[ref].z = numFmt
      }
    })
    // Date column (index 2)
    const dateRef = XLSX.utils.encode_cell({ r, c: 2 })
    if (ws[dateRef]) ws[dateRef].z = 'DD/MM/YYYY'
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Comprobantes')
  XLSX.writeFile(wb, buildFilename())
}
