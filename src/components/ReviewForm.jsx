import { useState } from 'react'

const TIPO_OPTIONS = ['A', 'B', 'C']

function isEmpty(v) {
  return v == null || v === ''
}

export default function ReviewForm({ imageDataURL, initialData, onConfirm, onDiscard }) {
  const [form, setForm] = useState({
    cuit: initialData?.cuit ?? '',
    razon_social: initialData?.razon_social ?? '',
    fecha: initialData?.fecha ?? '',
    tipo_comprobante: initialData?.tipo_comprobante ?? '',
    numero_comprobante: initialData?.numero_comprobante ?? '',
    importe_total: initialData?.importe_total ?? '',
    iva_discriminado: initialData?.iva_discriminado ?? '',
    observaciones: '',
  })

  const [errors, setErrors] = useState({})

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: false }))
  }

  function validate() {
    const required = ['cuit', 'razon_social', 'fecha', 'tipo_comprobante', 'numero_comprobante', 'importe_total']
    const errs = {}
    required.forEach((f) => {
      if (isEmpty(form[f])) errs[f] = true
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleConfirm() {
    if (!validate()) return
    onConfirm({
      ...form,
      importe_total: form.importe_total !== '' ? Number(form.importe_total) : null,
      iva_discriminado: form.iva_discriminado !== '' ? Number(form.iva_discriminado) : null,
    })
  }

  const fieldClass = (field) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors ${
      errors[field]
        ? 'border-yellow-400 bg-yellow-50'
        : isEmpty(form[field])
        ? 'border-yellow-200 bg-yellow-50/50'
        : 'border-gray-200 bg-white'
    }`

  return (
    <div className="fixed inset-0 bg-gray-50 flex flex-col z-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-brand-700 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow">
        <button onClick={onDiscard} className="text-white/80 hover:text-white">
          <ChevronLeftIcon />
        </button>
        <h2 className="font-semibold text-base">Revisar comprobante</h2>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-4 pb-6">
        {/* Thumbnail */}
        {imageDataURL && (
          <div className="relative">
            <img
              src={imageDataURL}
              alt="Comprobante capturado"
              className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-100"
            />
          </div>
        )}

        {/* Notice about highlighted fields */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-700 text-xs">
            Los campos marcados en amarillo son obligatorios o no pudieron leerse. Completalos antes de confirmar.
          </div>
        )}

        {/* Form fields */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-4">
          <Field label="CUIT del emisor *" error={errors.cuit}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="20123456789"
              value={form.cuit}
              onChange={(e) => handleChange('cuit', e.target.value)}
              className={fieldClass('cuit')}
            />
          </Field>

          <Field label="Razón social *" error={errors.razon_social}>
            <input
              type="text"
              placeholder="Nombre del emisor"
              value={form.razon_social}
              onChange={(e) => handleChange('razon_social', e.target.value)}
              className={fieldClass('razon_social')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha *" error={errors.fecha}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                value={form.fecha}
                onChange={(e) => handleChange('fecha', e.target.value)}
                className={fieldClass('fecha')}
              />
            </Field>

            <Field label="Tipo *" error={errors.tipo_comprobante}>
              <select
                value={form.tipo_comprobante}
                onChange={(e) => handleChange('tipo_comprobante', e.target.value)}
                className={fieldClass('tipo_comprobante')}
              >
                <option value="">—</option>
                {TIPO_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="N° de comprobante *" error={errors.numero_comprobante}>
            <input
              type="text"
              placeholder="0001-00012345"
              value={form.numero_comprobante}
              onChange={(e) => handleChange('numero_comprobante', e.target.value)}
              className={fieldClass('numero_comprobante')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Importe total *" error={errors.importe_total}>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={form.importe_total}
                onChange={(e) => handleChange('importe_total', e.target.value)}
                className={fieldClass('importe_total')}
              />
            </Field>

            <Field label="IVA discriminado">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                value={form.iva_discriminado}
                onChange={(e) => handleChange('iva_discriminado', e.target.value)}
                className={fieldClass('iva_discriminado')}
              />
            </Field>
          </div>

          <Field label="Observaciones">
            <input
              type="text"
              placeholder="Opcional"
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onDiscard}
            className="flex-1 border border-gray-300 text-gray-600 font-semibold py-3 rounded-xl text-sm active:bg-gray-50"
          >
            Descartar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-brand-700 text-white font-semibold py-3 rounded-xl text-sm active:bg-brand-800"
          >
            Confirmar y agregar
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-xs font-medium ${error ? 'text-yellow-600' : 'text-gray-500'}`}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ChevronLeftIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
