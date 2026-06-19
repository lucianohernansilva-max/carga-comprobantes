// Página de diagnóstico forense — muestra el estado interno de localStorage en tiempo real.
// Accesible en /diagnostico. NO modifica ningún dato.

import { useMemo } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getObligacionesCliente, getTipoObligacion, getTiposObligacion } from '../db/store.js'

export default function Diagnostico() {
  const { clientes, vencimientos, obligaciones, tipos } = useApp()

  // ── 1. Clientes RI ──────────────────────────────────────────────────────────
  const clientesRI = useMemo(() =>
    clientes.filter(c => c.condicionFiscal && c.condicionFiscal.toLowerCase().includes('inscript'))
  , [clientes])

  // ── 2. RI con obligación iva-mensual ────────────────────────────────────────
  const riConIva = useMemo(() =>
    clientesRI.map(c => {
      const obls = obligaciones.filter(o => o.clienteId === c.id)
      const ivaObl = obls.find(o => o.tipoObligacionId === 'iva-mensual')
      return { ...c, ivaObl, totalObls: obls.length }
    })
  , [clientesRI, obligaciones])

  // ── 3. Vencimientos IVA con fecha en junio 2026 (IVA vence en el mes SIGUIENTE al período)
  const ivaJunio = useMemo(() =>
    vencimientos.filter(v => v.tipoObligacionId === 'iva-mensual' && v.fecha?.startsWith('2026-06'))
  , [vencimientos])

  // ── 4. TODOS los vencimientos IVA (sin filtro de mes) ──────────────────────
  const ivaAll = useMemo(() =>
    vencimientos.filter(v => v.tipoObligacionId === 'iva-mensual')
  , [vencimientos])

  // ── 4b. Coexistencia IVA + IIBB para el mismo cliente en junio 2026 ─────────
  const coexistenciaJunio = useMemo(() => {
    const ivaPorCliente   = new Map(ivaJunio.map(v => [v.clienteId, v]))
    const iibbJunio = vencimientos.filter(v =>
      v.tipoObligacionId === 'iibb-local' && v.fecha?.startsWith('2026-06')
    )
    const iibbPorCliente  = new Map(iibbJunio.map(v => [v.clienteId, v]))
    const allClienteIds   = new Set([...ivaPorCliente.keys(), ...iibbPorCliente.keys()])
    return [...allClienteIds].map(cid => ({
      nombre: clientes.find(c => c.id === cid)?.nombre || cid,
      iva:    ivaPorCliente.get(cid),
      iibb:   iibbPorCliente.get(cid),
    }))
  }, [ivaJunio, vencimientos, clientes])

  // ── 5. Tipo iva-mensual almacenado ─────────────────────────────────────────
  const tipoIva = tipos.find(t => t.id === 'iva-mensual')

  // ── 6. condicionFiscal únicas en localStorage ───────────────────────────────
  const condicionesUnicas = useMemo(() =>
    [...new Set(clientes.map(c => c.condicionFiscal))]
  , [clientes])

  const row = 'border border-gray-200 px-3 py-2 text-left text-sm'
  const th  = 'border border-gray-300 px-3 py-2 bg-gray-100 text-left text-xs font-bold uppercase'

  return (
    <div className="p-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Diagnóstico Forense — IVA</h1>
        <p className="text-xs text-gray-500 mt-1">Solo lectura. Muestra el estado exacto del localStorage.</p>
      </div>

      {/* ── Resumen ejecutivo ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Clientes totales', val: clientes.length, ok: clientes.length > 0 },
          { label: 'Clientes RI (condicionFiscal incluye "inscript")', val: clientesRI.length, ok: clientesRI.length > 0 },
          { label: 'RI con iva-mensual activa', val: riConIva.filter(c => c.ivaObl?.activa).length, ok: riConIva.filter(c => c.ivaObl?.activa).length > 0 },
          { label: 'Vencimientos IVA junio 2026', val: ivaJunio.length, ok: ivaJunio.length > 0 },
        ].map(({ label, val, ok }) => (
          <div key={label} className={`rounded-xl border p-4 ${ok ? 'border-green-300 bg-green-50' : 'border-red-400 bg-red-50'}`}>
            <p className={`text-2xl font-black ${ok ? 'text-green-700' : 'text-red-700'}`}>{val}</p>
            <p className="text-xs text-gray-600 mt-1">{label}</p>
            <p className={`text-xs font-bold mt-1 ${ok ? 'text-green-600' : 'text-red-600'}`}>{ok ? '✓ OK' : '✗ PROBLEMA'}</p>
          </div>
        ))}
      </div>

      {/* ── Tipo iva-mensual almacenado ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">Tipo "iva-mensual" en localStorage</h2>
        {tipoIva ? (
          <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto">
            {JSON.stringify(tipoIva, null, 2)}
          </pre>
        ) : (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-700 font-bold">
            ✗ El tipo "iva-mensual" NO existe en localStorage — esto explica el bug.
          </div>
        )}
      </section>

      {/* ── condicionFiscal únicas ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">
          Valores únicos de condicionFiscal en localStorage ({condicionesUnicas.length} distintos)
        </h2>
        <div className="flex flex-wrap gap-2">
          {condicionesUnicas.map(c => (
            <span key={c} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-mono font-semibold text-gray-800">
              "{c}"
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          El código espera exactamente: <code>"responsable_inscripto"</code>, <code>"monotributista"</code>, <code>"autonomo"</code>, <code>"exento"</code>
        </p>
      </section>

      {/* ── Clientes RI con detalle ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">
          Clientes RI — todos los campos relevantes ({clientesRI.length})
        </h2>
        {clientesRI.length === 0 ? (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-700">
            ✗ No hay clientes con condicionFiscal que incluya "inscript". Esto significa que el valor almacenado es diferente al esperado.
          </div>
        ) : (
          <div className="space-y-3">
            {clientesRI.map(info => (
              <div key={info.id} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800">{info.nombre}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.ivaObl?.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    iva-mensual: {info.ivaObl ? (info.ivaObl.activa ? 'activa ✓' : 'INACTIVA ✗') : 'NO EXISTE ✗'}
                  </span>
                </div>
                <table className="w-full text-xs">
                  <tbody>
                    {[
                      ['id', info.id],
                      ['condicionFiscal', info.condicionFiscal],
                      ['cuit', info.cuit],
                      ['tipoPersona', info.tipoPersona],
                      ['activo', String(info.activo)],
                      ['Obligaciones totales', info.totalObls],
                      ['Obligación iva-mensual id', info.ivaObl?.id || '—'],
                      ['Obligación iva-mensual activa', info.ivaObl ? String(info.ivaObl.activa) : '—'],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-t border-gray-100">
                        <td className="px-4 py-1.5 font-semibold text-gray-500 w-48">{k}</td>
                        <td className="px-4 py-1.5 font-mono text-gray-800">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Vencimientos IVA totales ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">
          Todos los vencimientos IVA en localStorage ({ivaAll.length} total)
        </h2>
        {ivaAll.length === 0 ? (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-sm text-red-700 font-bold">
            ✗ No hay NINGÚN vencimiento con tipoObligacionId === "iva-mensual". La generación no está ocurriendo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr>{['clienteId','periodo','fecha','estado','obligacionClienteId'].map(h => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {ivaAll.slice(0, 30).map(v => (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className={row}>{clientes.find(c => c.id === v.clienteId)?.nombre || v.clienteId}</td>
                    <td className={row}>{v.periodo}</td>
                    <td className={`${row} font-bold ${v.periodo === '2026-06' ? 'text-primary' : ''}`}>{v.fecha}</td>
                    <td className={row}>{v.estado}</td>
                    <td className={`${row} font-mono text-gray-400`}>{v.obligacionClienteId?.slice(0,8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ivaAll.length > 30 && <p className="text-xs text-gray-400 px-4 py-2">… y {ivaAll.length - 30} más</p>}
          </div>
        )}
      </section>

      {/* ── Coexistencia IVA + IIBB junio 2026 ── */}
      {coexistenciaJunio.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">
            Coexistencia IVA + IIBB en junio 2026 (mismo cliente)
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr>{['Cliente','IVA fecha','IVA estado','IIBB fecha','IIBB estado','¿Coexisten?'].map(h => <th key={h} className={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {coexistenciaJunio.map(({ nombre, iva, iibb }) => (
                  <tr key={nombre} className="border-t border-gray-100">
                    <td className={`${row} font-semibold`}>{nombre}</td>
                    <td className={`${row} ${iva ? 'text-green-700 font-bold' : 'text-red-500'}`}>{iva?.fecha || '✗ no existe'}</td>
                    <td className={row}>{iva?.estado || '—'}</td>
                    <td className={`${row} ${iibb ? 'text-green-700 font-bold' : 'text-gray-400'}`}>{iibb?.fecha || '—'}</td>
                    <td className={row}>{iibb?.estado || '—'}</td>
                    <td className={`${row} font-bold ${iva && iibb ? 'text-green-700' : iva ? 'text-blue-600' : 'text-red-600'}`}>
                      {iva && iibb ? '✓ ambos' : iva ? 'solo IVA' : 'solo IIBB'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Todos los tipos almacenados ── */}
      <section>
        <h2 className="text-sm font-bold text-gray-700 uppercase mb-2">
          Todos los tipos de obligación en localStorage ({tipos.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr>{['id','patron','condicionesFiscales','activo'].map(h => <th key={h} className={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {tipos.map(t => (
                <tr key={t.id} className={`border-t border-gray-100 ${t.id === 'iva-mensual' ? 'bg-yellow-50' : ''}`}>
                  <td className={`${row} font-bold`}>{t.id}</td>
                  <td className={row}>{t.patron}</td>
                  <td className={`${row} font-mono`}>{JSON.stringify(t.condicionesFiscales)}</td>
                  <td className={row}>{String(t.activo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
