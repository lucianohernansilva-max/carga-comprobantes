// Corre dentro de la pestaña de la app (localhost:5173).
// Responde mensajes del popup/background con datos de localStorage.

function leerDatos() {
  try {
    const vencimientos = JSON.parse(localStorage.getItem('vc_vencimientos') || '[]')
    const clientes     = JSON.parse(localStorage.getItem('vc_clientes')     || '[]')
    const tipos        = JSON.parse(localStorage.getItem('vc_tipos_obligacion') || '[]')
    const config       = JSON.parse(localStorage.getItem('vc_config')       || '{}')
    return { vencimientos, clientes, tipos, config, ts: Date.now() }
  } catch (e) {
    return { vencimientos: [], clientes: [], tipos: [], config: {}, error: e.message }
  }
}

// Guardar en chrome.storage.local para que el popup funcione aunque la app esté cerrada
function sincronizar() {
  const data = leerDatos()
  chrome.storage.local.set({ appData: data })
}

// Sincronizar al cargar la página y cada vez que localStorage cambia
sincronizar()
window.addEventListener('storage', sincronizar)

// Responder peticiones on-demand desde el popup o el background
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  if (req.action === 'getData') {
    sincronizar()
    sendResponse(leerDatos())
  }
  return true
})
