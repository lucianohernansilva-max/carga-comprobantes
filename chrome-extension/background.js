// Service worker: actualiza el badge del ícono periódicamente.

const APP_URL = 'http://localhost:5173/'
const AZUL    = '#1e3a5f'
const ROJO    = '#C0392B'

function hoyStr() {
  return new Date().toISOString().slice(0, 10)
}
function en7Str() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function contarUrgentes(vencimientos) {
  const hoy = hoyStr()
  const en7 = en7Str()
  const completo = ['pagado', 'presentado', 'no_aplica']
  return vencimientos.filter(v =>
    v.fecha <= en7 && !completo.includes(v.estado)
  ).length
}

async function actualizarBadge() {
  let count = 0

  // Intentar leer desde la pestaña abierta (datos frescos)
  try {
    const tabs = await chrome.tabs.query({ url: 'http://localhost:5173/*' })
    if (tabs.length > 0) {
      const resp = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getData' })
      if (resp?.vencimientos) {
        count = contarUrgentes(resp.vencimientos)
        await chrome.storage.local.set({ appData: { ...resp, ts: Date.now() } })
      }
    }
  } catch (_) {
    // La pestaña puede no estar lista aún; usar caché
    const cached = await chrome.storage.local.get('appData')
    if (cached?.appData?.vencimientos) {
      count = contarUrgentes(cached.appData.vencimientos)
    }
  }

  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) })
    chrome.action.setBadgeBackgroundColor({ color: ROJO })
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

// Actualizar al instalar y cada minuto
chrome.runtime.onInstalled.addListener(actualizarBadge)
chrome.alarms.create('tick', { periodInMinutes: 1 })
chrome.alarms.onAlarm.addListener(actualizarBadge)

// Actualizar también cuando el popup se abre (lo pide via mensaje)
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === 'refreshBadge') {
    actualizarBadge().then(() => sendResponse({ ok: true }))
    return true
  }
})
