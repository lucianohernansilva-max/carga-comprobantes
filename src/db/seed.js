// Datos iniciales: tipos de obligaciones predefinidos y 3 clientes de ejemplo.

import { PATRONES } from './fechas.js'
import {
  isInitialized, setInitialized,
  saveTipoObligacion, saveCliente, saveObligacionCliente,
  getTiposObligacion,
} from './store.js'
import { generarVencimientosCliente } from './generador.js'

// ─── Tipos de obligación predefinidos ────────────────────────────────────────

const TIPOS_PREDEFINIDOS = [
  {
    id: 'iva-mensual',
    nombre: 'IVA Mensual',
    descripcion: 'DDJJ mensual de IVA – Responsables Inscriptos',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'iva', mesOffset: 1 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto'],
  },
  {
    id: 'monotributo-cuota',
    nombre: 'Monotributo – Cuota mensual',
    descripcion: 'Pago mensual de cuota Monotributo (categoría + obra social)',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_DIA_FIJO,
    configuracion: { dia: 20 },
    activo: true, esCustom: false,
    condicionesFiscales: ['monotributista'],
  },
  {
    id: 'monotributo-recategorizacion',
    nombre: 'Monotributo – Recategorización semestral',
    descripcion: 'Recategorización semestral obligatoria (enero y julio)',
    periodicidad: 'semestral',
    patron: PATRONES.PATRON_SEMESTRAL_FIJO,
    configuracion: { meses: [1, 7], dia: 20 },
    activo: true, esCustom: false,
    condicionesFiscales: ['monotributista'],
  },
  {
    id: 'anticipos-ganancias-humanas',
    nombre: 'Anticipos Ganancias – Personas Humanas',
    descripcion: 'Anticipos mensuales de Ganancias (10 cuotas, junio a marzo)',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'iva', mesOffset: 0, mesesAplicables: [6,7,8,9,10,11,12,1,2,3] },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'autonomo'],
  },
  {
    id: 'anticipos-ganancias-juridicas',
    nombre: 'Anticipos Ganancias – Personas Jurídicas',
    descripcion: 'Anticipos mensuales de Ganancias PJ según terminación de CUIT',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'gananciasSociedades', mesOffset: 5 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto'],
    tiposPersona: ['juridica'],
  },
  {
    id: 'ganancias-anual-humanas',
    nombre: 'DDJJ Ganancias Anual – Personas Humanas',
    descripcion: 'Declaración jurada anual de Ganancias, personas humanas (vence en junio)',
    periodicidad: 'anual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'gananciasHumanasDDJJ', mesOffset: 0, mesesAplicables: [6] },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'autonomo'],
    tiposPersona: ['humana'],
  },
  {
    id: 'ganancias-anual-juridicas',
    nombre: 'DDJJ Ganancias Anual – Personas Jurídicas',
    descripcion: 'Declaración jurada anual de Ganancias PJ (5 meses post-cierre)',
    periodicidad: 'anual',
    patron: PATRONES.PATRON_DIAS_CIERRE,
    configuracion: { mesesDespues: 5, tablaKey: 'gananciasSociedades' },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto'],
    tiposPersona: ['juridica'],
  },
  {
    id: 'bienes-personales',
    nombre: 'Bienes Personales Anual',
    descripcion: 'Declaración jurada anual de Bienes Personales',
    periodicidad: 'anual',
    patron: PATRONES.PATRON_SEMESTRAL_FIJO,
    configuracion: { meses: [6], dia: 30 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'autonomo'],
    tiposPersona: ['humana'],
  },
  {
    id: 'iibb-local',
    nombre: 'IIBB – Régimen Local',
    descripcion: 'Ingresos Brutos Régimen Local por provincia',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_FECHA_PROVINCIA,
    configuracion: { dia: 15, provincia: '' },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'monotributista', 'autonomo'],
  },
  {
    id: 'iibb-cm',
    nombre: 'IIBB – Convenio Multilateral (CM05)',
    descripcion: 'Ingresos Brutos Convenio Multilateral mensual',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'iibbCm', mesOffset: 1 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto'],
  },
  {
    id: 'casas-particulares',
    nombre: 'Casas Particulares (Empleados de Hogar)',
    descripcion: 'DDJJ mensual para empleadores de personal de casas particulares',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'casasParticulares', mesOffset: 1 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'monotributista', 'autonomo', 'exento'],
  },
  {
    id: 'autonomos-aportes',
    nombre: 'Autónomos – Aportes al SIPA',
    descripcion: 'Aportes mensuales al sistema previsional para trabajadores autónomos',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'autonomos', mesOffset: 0 },
    activo: true, esCustom: false,
    condicionesFiscales: ['autonomo'],
  },
  {
    id: 'f931',
    nombre: 'F931 – DDJJ Cargas Sociales',
    descripcion: 'Declaración jurada mensual de cargas sociales para empleadores',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'f931', mesOffset: 1 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'monotributista'],
    requiereEmpleados: true,
  },
  {
    id: 'lsd',
    nombre: 'Libro de Sueldos Digital (LSD)',
    descripcion: 'Presentación mensual del Libro de Sueldos Digital',
    periodicidad: 'mensual',
    patron: PATRONES.PATRON_CUIT,
    configuracion: { tablaKey: 'lsd', mesOffset: 1 },
    activo: true, esCustom: false,
    condicionesFiscales: ['responsable_inscripto', 'monotributista'],
    requiereEmpleados: true,
  },
]

// ─── Clientes de ejemplo ──────────────────────────────────────────────────────

const CLIENTES_EJEMPLO = [
  {
    id: 'cliente-1',
    nombre: 'Juan García',
    cuit: '20-25678901-4',
    condicionFiscal: 'monotributista',
    categoriaMonotributo: 'D',
    categoriaAutonomo: null,
    tipoPersona: 'humana',
    fechaCierreEjercicio: null,
    actividadPrincipal: 'Comercio al por menor',
    jurisdiccionesIIBB: ['Chaco'],
    liquidaAnticiposGanancias: false,
    tieneEmpleados: false,
    cantidadEmpleados: null,
    notas: 'Cliente desde 2022. Monotributista categoría D.',
    activo: true,
  },
  {
    id: 'cliente-2',
    nombre: 'Agropecuaria del Norte SRL',
    cuit: '30-71234567-2',
    condicionFiscal: 'responsable_inscripto',
    categoriaMonotributo: null,
    categoriaAutonomo: null,
    tipoPersona: 'juridica',
    fechaCierreEjercicio: '03-31',
    actividadPrincipal: 'Producción agrícola y ganadera',
    jurisdiccionesIIBB: ['Chaco', 'Corrientes', 'Santa Fe'],
    liquidaAnticiposGanancias: true,
    tieneEmpleados: true,
    cantidadEmpleados: 3,
    notas: 'SRL con cierre 31/03. Inscripta en Convenio Multilateral.',
    activo: true,
  },
  {
    id: 'cliente-3',
    nombre: 'María López',
    cuit: '27-18765432-6',
    condicionFiscal: 'autonomo',
    categoriaMonotributo: null,
    categoriaAutonomo: 'III',
    tipoPersona: 'humana',
    fechaCierreEjercicio: null,
    actividadPrincipal: 'Servicios profesionales de salud',
    jurisdiccionesIIBB: [],
    liquidaAnticiposGanancias: false,
    tieneEmpleados: true,
    cantidadEmpleados: 1,
    notas: 'Autónoma categoría III. Tiene 1 empleada doméstica.',
    activo: true,
  },
]

// Obligaciones asignadas a los clientes de ejemplo
const buildObligaciones = () => [
  // Juan García (monotributista)
  { id: 'obl-1', clienteId: 'cliente-1', tipoObligacionId: 'monotributo-cuota',        activa: true, configuracionExtra: {} },
  { id: 'obl-2', clienteId: 'cliente-1', tipoObligacionId: 'monotributo-recategorizacion', activa: true, configuracionExtra: {} },
  { id: 'obl-3', clienteId: 'cliente-1', tipoObligacionId: 'iibb-local',               activa: true, configuracionExtra: { dia: 15, provincia: 'Chaco' } },

  // Agropecuaria del Norte SRL (RI, PJ, empleados, CM)
  { id: 'obl-4',  clienteId: 'cliente-2', tipoObligacionId: 'iva-mensual',               activa: true, configuracionExtra: {} },
  { id: 'obl-5',  clienteId: 'cliente-2', tipoObligacionId: 'f931',                      activa: true, configuracionExtra: {} },
  { id: 'obl-6',  clienteId: 'cliente-2', tipoObligacionId: 'lsd',                       activa: true, configuracionExtra: {} },
  { id: 'obl-7',  clienteId: 'cliente-2', tipoObligacionId: 'anticipos-ganancias-juridicas', activa: true, configuracionExtra: {} },
  { id: 'obl-8',  clienteId: 'cliente-2', tipoObligacionId: 'ganancias-anual-juridicas', activa: true, configuracionExtra: {} },
  { id: 'obl-9',  clienteId: 'cliente-2', tipoObligacionId: 'iibb-cm',                   activa: true, configuracionExtra: {} },

  // María López (autónoma + casas particulares)
  { id: 'obl-10', clienteId: 'cliente-3', tipoObligacionId: 'autonomos-aportes',         activa: true, configuracionExtra: {} },
  { id: 'obl-11', clienteId: 'cliente-3', tipoObligacionId: 'casas-particulares',        activa: true, configuracionExtra: {} },
  { id: 'obl-12', clienteId: 'cliente-3', tipoObligacionId: 'bienes-personales',         activa: true, configuracionExtra: {} },
]

// Migración idempotente: asegura que todos los tipos predefinidos existen y tienen
// condicionesFiscales, patron y configuracion correctos según la versión actual del código.
// Se llama en cada arranque. Preserva activo/esCustom definidos por el usuario.
export const sincronizarTiposPredefinidos = () => {
  const stored = getTiposObligacion()
  const storedMap = Object.fromEntries(stored.map(t => [t.id, t]))
  for (const tipo of TIPOS_PREDEFINIDOS) {
    const exist = storedMap[tipo.id]
    if (!exist) {
      saveTipoObligacion(tipo)
      console.debug('[Seed] Tipo creado (faltaba): %s', tipo.id)
    } else {
      // Siempre resincronizar campos estructurales desde predefinidos.
      // condicionesFiscales, patron y configuracion no son editables por el usuario,
      // así que los pisamos sin preguntar para corregir datos de versiones anteriores.
      const condOk  = JSON.stringify(exist.condicionesFiscales) === JSON.stringify(tipo.condicionesFiscales)
      const patronOk = exist.patron === tipo.patron
      if (!condOk || !patronOk) {
        saveTipoObligacion({
          ...exist,
          condicionesFiscales: tipo.condicionesFiscales,
          patron:              tipo.patron,
          configuracion:       tipo.configuracion,
        })
        console.debug('[Seed] Tipo resincronizado: %s — condiciones=[%s] patron=%s',
          tipo.id,
          (tipo.condicionesFiscales || []).join(','),
          tipo.patron
        )
      }
    }
  }
}

export const initSeed = () => {
  if (isInitialized()) return

  // Tipos de obligación
  for (const tipo of TIPOS_PREDEFINIDOS) saveTipoObligacion(tipo)

  // Clientes
  for (const cliente of CLIENTES_EJEMPLO) saveCliente(cliente)

  // Obligaciones
  for (const obl of buildObligaciones()) saveObligacionCliente(obl)

  // Generar vencimientos 12 meses
  for (const cliente of CLIENTES_EJEMPLO) {
    generarVencimientosCliente(cliente, { horizonte: 12 })
  }

  setInitialized()
}
