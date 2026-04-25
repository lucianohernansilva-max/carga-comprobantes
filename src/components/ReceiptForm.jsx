import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Building2, Hash, Calendar, DollarSign, FileText } from 'lucide-react'
import { TIPOS_COMPROBANTE, IVA_ALICUOTAS, formatCUIT } from '../utils/formatters'

export default function ReceiptForm({ onSubmit, defaultValues, isSubmitting }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      tipo: 'FACTURA_B',
      fecha: new Date().toISOString().split('T')[0],
      alicuotaIva: '21',
      moneda: 'ARS',
    },
  })

  const watchNeto = watch('netoGravado')
  const watchAlicuota = watch('alicuotaIva')
  const watchIva = watch('iva')
  const watchOtros = watch('otrosImpuestos')

  useEffect(() => {
    const neto = parseFloat(watchNeto) || 0
    const alicuota = parseFloat(watchAlicuota) || 0
    const ivaCalc = (neto * alicuota) / 100
    setValue('iva', ivaCalc.toFixed(2))
    const otros = parseFloat(watchOtros) || 0
    setValue('total', (neto + ivaCalc + otros).toFixed(2))
  }, [watchNeto, watchAlicuota, watchOtros])

  useEffect(() => {
    const neto = parseFloat(watchNeto) || 0
    const iva = parseFloat(watchIva) || 0
    const otros = parseFloat(watchOtros) || 0
    setValue('total', (neto + iva + otros).toFixed(2))
  }, [watchIva, watchOtros])

  function handleCUITChange(e) {
    const formatted = formatCUIT(e.target.value)
    setValue('cuitEmisor', formatted)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Tipo y Fecha */}
      <div className="form-section">
        <div className="form-section-title">
          <FileText size={14} /> Datos del comprobante
        </div>

        <div className="form-group">
          <label className="form-label">
            Tipo de comprobante <span className="required">*</span>
          </label>
          <select
            className={`form-select ${errors.tipo ? 'error' : ''}`}
            {...register('tipo', { required: 'Requerido' })}
          >
            {TIPOS_COMPROBANTE.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          {errors.tipo && <p className="form-error">{errors.tipo.message}</p>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Punto de venta <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.puntoVenta ? 'error' : ''}`}
              type="number"
              placeholder="0001"
              inputMode="numeric"
              {...register('puntoVenta', {
                required: 'Requerido',
                min: { value: 1, message: 'Mín 1' },
                max: { value: 9999, message: 'Máx 9999' },
              })}
            />
            {errors.puntoVenta && <p className="form-error">{errors.puntoVenta.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              Nro. comprobante <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.numeroComprobante ? 'error' : ''}`}
              type="number"
              placeholder="00000001"
              inputMode="numeric"
              {...register('numeroComprobante', {
                required: 'Requerido',
                min: { value: 1, message: 'Mín 1' },
              })}
            />
            {errors.numeroComprobante && <p className="form-error">{errors.numeroComprobante.message}</p>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            Fecha de emisión <span className="required">*</span>
          </label>
          <input
            className={`form-input ${errors.fecha ? 'error' : ''}`}
            type="date"
            {...register('fecha', { required: 'Requerido' })}
          />
          {errors.fecha && <p className="form-error">{errors.fecha.message}</p>}
        </div>
      </div>

      {/* Emisor */}
      <div className="form-section">
        <div className="form-section-title">
          <Building2 size={14} /> Datos del emisor
        </div>

        <div className="form-group">
          <label className="form-label">
            CUIT emisor <span className="required">*</span>
          </label>
          <input
            className={`form-input ${errors.cuitEmisor ? 'error' : ''}`}
            type="text"
            placeholder="20-12345678-9"
            inputMode="numeric"
            maxLength={13}
            {...register('cuitEmisor', {
              required: 'Requerido',
              pattern: {
                value: /^\d{2}-\d{8}-\d{1}$/,
                message: 'Formato: XX-XXXXXXXX-X',
              },
              onChange: handleCUITChange,
            })}
          />
          {errors.cuitEmisor && <p className="form-error">{errors.cuitEmisor.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">
            Razón social <span className="required">*</span>
          </label>
          <input
            className={`form-input ${errors.razonSocial ? 'error' : ''}`}
            type="text"
            placeholder="Nombre o razón social"
            {...register('razonSocial', { required: 'Requerido', minLength: { value: 2, message: 'Mín 2 caracteres' } })}
          />
          {errors.razonSocial && <p className="form-error">{errors.razonSocial.message}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">Domicilio</label>
          <input
            className="form-input"
            type="text"
            placeholder="Dirección del emisor"
            {...register('domicilioEmisor')}
          />
        </div>
      </div>

      {/* Importes */}
      <div className="form-section">
        <div className="form-section-title">
          <DollarSign size={14} /> Importes
        </div>

        <div className="form-group">
          <label className="form-label">
            Neto gravado <span className="required">*</span>
          </label>
          <input
            className={`form-input ${errors.netoGravado ? 'error' : ''}`}
            type="number"
            placeholder="0.00"
            step="0.01"
            min="0"
            inputMode="decimal"
            {...register('netoGravado', {
              required: 'Requerido',
              min: { value: 0, message: 'Debe ser positivo' },
            })}
          />
          {errors.netoGravado && <p className="form-error">{errors.netoGravado.message}</p>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Alícuota IVA</label>
            <select className="form-select" {...register('alicuotaIva')}>
              {IVA_ALICUOTAS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">IVA ($)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register('iva')}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Otros impuestos</label>
            <input
              className="form-input"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              inputMode="decimal"
              {...register('otrosImpuestos')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Total <span className="required">*</span>
            </label>
            <input
              className={`form-input ${errors.total ? 'error' : ''}`}
              type="number"
              step="0.01"
              inputMode="decimal"
              style={{ fontWeight: 700 }}
              {...register('total', {
                required: 'Requerido',
                min: { value: 0, message: 'Positivo' },
              })}
            />
            {errors.total && <p className="form-error">{errors.total.message}</p>}
          </div>
        </div>
      </div>

      {/* CAE */}
      <div className="form-section">
        <div className="form-section-title">
          <Hash size={14} /> Autorización AFIP
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">CAE</label>
            <input
              className="form-input"
              type="text"
              placeholder="71234567890123"
              inputMode="numeric"
              maxLength={14}
              {...register('cae', {
                pattern: { value: /^\d{14}$/, message: '14 dígitos' },
              })}
            />
            {errors.cae && <p className="form-error">{errors.cae.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Vto. CAE</label>
            <input
              className="form-input"
              type="date"
              {...register('vencimientoCae')}
            />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="form-section">
        <div className="form-group">
          <label className="form-label">Observaciones</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Notas adicionales..."
            style={{ resize: 'none' }}
            {...register('observaciones')}
          />
        </div>
      </div>

      <button type="submit" className="btn btn-success" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Guardar comprobante'}
      </button>
    </form>
  )
}
