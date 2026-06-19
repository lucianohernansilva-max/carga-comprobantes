// Utilidades para importación/exportación de clientes desde Excel.
// Centralizado acá para mantener la lógica fuera del componente UI.

import * as XLSX from 'xlsx'

// ─── Columnas de la plantilla ─────────────────────────────────────────────────

export const COLUMNAS_PLANTILLA = [
  { key: 'nombre',                label: 'Nombre / Razón Social',         ejemplo: 'Juan García',           requerido: true  },
  { key: 'cuit',                  label: 'CUIT',                          ejemplo: '20-25678901-4',          requerido: true  },
  { key: 'condicionFiscal',       label: 'Condición Fiscal',              ejemplo: 'monotributista',         requerido: true  },
  { key: 'categoriaMonotributo',  label: 'Categoría Monotributo',         ejemplo: 'D',                      requerido: false },
  { key: 'categoriaAutonomo',     label: 'Categoría Autónomo',            ejemplo: 'III',                    requerido: false },
  { key: 'tipoPersona',           label: 'Tipo de Persona',               ejemplo: 'humana',                 requerido: false },
  { key: 'fechaCierreEjercicio',  label: 'Fecha Cierre Ejercicio (MM-DD)',ejemplo: '03-31',                  requerido: false },
  { key: 'actividadPrincipal',    label: 'Actividad Principal',           ejemplo: 'Comercio al por menor',  requerido: false },
  { key: 'jurisdiccionesIIBB',    label: 'Provincias IIBB (sep. por ;)',  ejemplo: 'Chaco;Corrientes',       requerido: false },
  { key: 'liquidaAnticiposGanancias', label: 'Liquida Anticipos Ganancias (SI/NO)', ejemplo: 'NO',          requerido: false },
  { key: 'tieneEmpleados',        label: 'Tiene Empleados (SI/NO)',       ejemplo: 'NO',                     requerido: false },
  { key: 'cantidadEmpleados',     label: 'Cantidad Empleados',            ejemplo: '',                       requerido: false },
  { key: 'notas',                 label: 'Notas',                         ejemplo: '',                       requerido: false },
]

const CONDICION_MAP = {
  'monotributista':        'monotributista',
  'monotributo':           'monotributista',
  'responsable inscripto': 'responsable_inscripto',
  'responsable_inscripto': 'responsable_inscripto',
  'ri':                    'responsable_inscripto',
  'exento':                'exento',
  'autonomo':              'autonomo',
  'autónomo':              'autonomo',
}

const parseBool = (val) => {
  if (!val) return false
  return String(val).trim().toUpperCase() === 'SI' || String(val).trim().toUpperCase() === 'SÍ'
}

const normalizarCuit = (val) => {
  if (!val) return ''
  // Acepta "20-12345678-9" o "20123456789"
  const digits = String(val).replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0,2)}-${digits.slice(2,10)}-${digits.slice(10)}`
  return String(val).trim()
}

// ─── Generar plantilla descargable ───────────────────────────────────────────

export const descargarPlantilla = () => {
  const headers = COLUMNAS_PLANTILLA.map(c => c.label)
  const ejemplo = COLUMNAS_PLANTILLA.map(c => c.ejemplo)
  const nota    = COLUMNAS_PLANTILLA.map(c => c.requerido ? '* Requerido' : 'Opcional')

  const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo, nota])

  // Ancho de columnas
  ws['!cols'] = COLUMNAS_PLANTILLA.map(() => ({ wch: 28 }))

  // Estilo encabezado (solo disponible con xlsx-style, acá lo indicamos con comentario)
  // Para una plantilla más rica usar xlsx-style o ExcelJS en el futuro

  // Segunda hoja con valores aceptados
  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['Campo',               'Valores aceptados'],
    ['Condición Fiscal',    'monotributista / responsable_inscripto / exento / autonomo'],
    ['Categoría Monotributo','A / B / C / D / E / F / G / H / I / J / K'],
    ['Categoría Autónomo',  'I / II / III / IV / V'],
    ['Tipo de Persona',     'humana / juridica'],
    ['Fecha Cierre Ejercicio', 'Formato MM-DD (ej: 03-31 para 31 de marzo)'],
    ['Provincias IIBB',     'Separar con punto y coma: Chaco;Buenos Aires;CABA'],
    ['Anticipos/Empleados', 'SI o NO'],
  ])
  wsInfo['!cols'] = [{ wch: 30 }, { wch: 60 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws,     'Clientes')
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Valores aceptados')
  XLSX.writeFile(wb, 'plantilla_clientes_vencimientosfi.xlsx')
}

// ─── Parsear archivo Excel subido ────────────────────────────────────────────

export const parsearExcelClientes = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'binary' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

        // Normalizar encabezados: buscar por label o por key
        const labelToKey = {}
        for (const col of COLUMNAS_PLANTILLA) {
          labelToKey[col.label.toLowerCase()]  = col.key
          labelToKey[col.key.toLowerCase()]    = col.key
        }

        const clientes = rows.map((row, i) => {
          // Normalizar keys del row
          const norm = {}
          for (const [k, v] of Object.entries(row)) {
            const mapped = labelToKey[k.trim().toLowerCase()]
            if (mapped) norm[mapped] = v
          }

          const cuit = normalizarCuit(norm.cuit)
          const condicion = CONDICION_MAP[(norm.condicionFiscal || '').toLowerCase().trim()] || 'monotributista'

          return {
            _rowIndex: i + 2,  // para mensajes de error (fila en Excel = i+2 por header)
            nombre:                   String(norm.nombre || '').trim(),
            cuit,
            condicionFiscal:          condicion,
            categoriaMonotributo:     String(norm.categoriaMonotributo || '').trim() || null,
            categoriaAutonomo:        String(norm.categoriaAutonomo    || '').trim() || null,
            tipoPersona:              ['juridica'].includes(String(norm.tipoPersona || '').toLowerCase()) ? 'juridica' : 'humana',
            fechaCierreEjercicio:     String(norm.fechaCierreEjercicio || '').trim() || null,
            actividadPrincipal:       String(norm.actividadPrincipal   || '').trim(),
            jurisdiccionesIIBB:       (norm.jurisdiccionesIIBB || '').toString().split(';').map(s => s.trim()).filter(Boolean),
            liquidaAnticiposGanancias: parseBool(norm.liquidaAnticiposGanancias),
            tieneEmpleados:           parseBool(norm.tieneEmpleados),
            cantidadEmpleados:        norm.cantidadEmpleados ? Number(norm.cantidadEmpleados) : null,
            notas:                    String(norm.notas || '').trim(),
            activo:                   true,
          }
        }).filter(c => c.nombre || c.cuit) // eliminar filas completamente vacías

        resolve(clientes)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

// ─── Validar y clasificar filas parseadas ────────────────────────────────────

export const validarClientesImportados = (candidatos, clientesExistentes) => {
  const cuitExistentes = new Set(clientesExistentes.map(c =>
    c.cuit.replace(/\D/g,'')
  ))

  const resultados = candidatos.map(c => {
    const errores = []
    if (!c.nombre) errores.push('Falta el nombre')
    if (!c.cuit)   errores.push('Falta el CUIT')

    const cuitDigits = c.cuit.replace(/\D/g,'')
    const duplicado  = cuitDigits && cuitExistentes.has(cuitDigits)

    return {
      ...c,
      errores,
      duplicado,
      importar: errores.length === 0 && !duplicado,
    }
  })

  return resultados
}
