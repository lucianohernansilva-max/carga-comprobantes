const APP_URL = 'http://localhost:5173/'

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}
function addDaysStr(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}
function parseFecha(str) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function diasRestantes(fechaStr) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const dest = parseFecha(fechaStr)
  return Math.round((dest - hoy) / 86400000)
}

function urgenciaClass(dias) {
  if (dias <= 0) return 'urgencia-rojo'
  if (dias <= 3) return 'urgencia-naranja'
  if (dias <= 7) return 'urgencia-amarillo'
  return 'urgencia-normal'
}

function diasChipHtml(dias) {
  if (dias <= 0) {
    const d = Math.abs(dias)
    return `<span class="dias-chip dias-hoy">${d === 0 ? 'Hoy' : 'Vencido'}</span>`
  }
  if (dias === 1) return `<span class="dias-chip dias-naranja">Mañana</span>`
  if (dias <= 3)  return `<span class="dias-chip dias-naranja">${dias}d</span>`
  if (dias <= 7)  return `<span class="dias-chip dias-amarillo">${dias}d</span>`
  return `<span class="dias-chip dias-normal">${dias}d</span>`
}

function formatFechaCorta(fechaStr) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return { dia: String(d).padStart(2, '0'), mes: MESES_CORTOS[m - 1] }
}

function renderCard(v, clienteNombre, tipoNombre) {
  const dias = diasRestantes(v.fecha)
  const { dia, mes } = formatFechaCorta(v.fecha)
  const urg = urgenciaClass(dias)
  return `
    <div class="venc-card ${urg}">
      <div class="venc-fecha">
        <div class="dia">${dia}</div>
        <div class="mes">${mes}</div>
      </div>
      <div class="venc-info">
        <div class="venc-tipo">${tipoNombre}</div>
        <div class="venc-cliente">${clienteNombre}</div>
      </div>
      <div class="venc-dias">${diasChipHtml(dias)}</div>
    </div>`
}

function renderData({ vencimientos, clientes, tipos }) {
  const hoy = hoyStr()
  const en7 = addDaysStr(7)
  const completo = ['pagado', 'presentado', 'no_aplica']

  const clienteMap = Object.fromEntries(clientes.map(c => [c.id, c.nombre]))
  const tipoMap    = Object.fromEntries(tipos.map(t => [t.id, t.nombre]))

  const relevantes = vencimientos
    .filter(v => v.fecha <= en7 && !completo.includes(v.estado))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const deHoy    = relevantes.filter(v => v.fecha === hoy)
  const deSemana = relevantes.filter(v => v.fecha >  hoy)

  if (relevantes.length === 0) {
    return `
      <div class="empty">
        <div class="empty-icon">✅</div>
        <div class="empty-title">Sin vencimientos esta semana</div>
        <div style="margin-top:4px">Todos los compromisos están al día</div>
      </div>`
  }

  let html = ''

  if (deHoy.length > 0) {
    html += `<div class="section-label hoy">● HOY — ${deHoy.length} vencimiento${deHoy.length !== 1 ? 's' : ''}</div>`
    html += deHoy.map(v => renderCard(v, clienteMap[v.clienteId] || '—', tipoMap[v.tipoObligacionId] || '—')).join('')
  }

  if (deSemana.length > 0) {
    html += `<div class="section-label semana">Esta semana</div>`
    html += deSemana.map(v => renderCard(v, clienteMap[v.clienteId] || '—', tipoMap[v.tipoObligacionId] || '—')).join('')
  }

  return html
}

async function cargar() {
  const content = document.getElementById('content')
  const footer  = document.getElementById('footer')

  // Intentar leer desde la pestaña de la app (datos frescos)
  let data = null
  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:5173/*' })
    if (tabs.length > 0) {
      data = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getData' })
    }
  } catch (_) {}

  // Fallback: caché en chrome.storage.local
  if (!data?.vencimientos) {
    const cached = await chrome.storage.local.get('appData')
    if (cached?.appData?.vencimientos) {
      data = cached.appData
      const mins = Math.round((Date.now() - (data.ts || 0)) / 60000)
      footer.textContent = `Datos en caché · hace ${mins} min · Abrí la app para actualizar`
    } else {
      content.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔌</div>
          <div class="empty-title">App no encontrada</div>
          <div style="margin-top:4px">Abrí <strong>localhost:5173</strong> en una pestaña para sincronizar los datos</div>
        </div>`
      footer.textContent = 'Sin conexión a la app'
      return
    }
  } else {
    const hoy = hoyStr()
    footer.textContent = `Actualizado hoy · ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
  }

  content.innerHTML = renderData(data)

  // Pedir al background que refresque el badge
  chrome.runtime.sendMessage({ action: 'refreshBadge' })
}

// Botón "Abrir app"
document.getElementById('btnOpen').addEventListener('click', (e) => {
  e.preventDefault()
  chrome.tabs.create({ url: APP_URL })
})

// Cargar al abrir el popup
cargar()
