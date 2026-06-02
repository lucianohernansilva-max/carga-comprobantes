# Extensión Chrome — Vencimientos Estudio Silva

## Instalación

### Paso 1 — Descargar los archivos
Copiá la carpeta `chrome-extension` completa a tu computadora.
Asegurate de que tenga esta estructura:
```
chrome-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Paso 2 — Abrir el gestor de extensiones de Chrome
1. Abrí Google Chrome
2. Escribí en la barra de direcciones: `chrome://extensions`
3. Presioná Enter

### Paso 3 — Activar modo desarrollador
En la esquina superior derecha de la página de extensiones,
activá el toggle **"Modo desarrollador"** (Developer mode).

### Paso 4 — Cargar la extensión
1. Hacé clic en el botón **"Cargar descomprimida"** (Load unpacked)
2. Navegá hasta la carpeta `chrome-extension` en tu computadora
3. Seleccioná esa carpeta y hacé clic en **"Seleccionar carpeta"**

### Paso 5 — Verificar la instalación
- Deberías ver la extensión "Vencimientos — Estudio Silva" en la lista
- En la barra de Chrome aparece el ícono azul marino
- Si hay vencimientos en los próximos 7 días, verás un número rojo en el ícono

---

## Uso

### Badge numérico
El ícono muestra automáticamente cuántos vencimientos pendientes
hay en los próximos 7 días. Se actualiza cada minuto.

### Popup
Al hacer clic en el ícono se abre el panel con:
- **HOY** (fondo rojo): obligaciones que vencen hoy
- **Esta semana**: próximos 7 días, ordenados por fecha
- Código de colores: 🔴 hoy/vencido · 🟠 ≤3 días · 🟡 ≤7 días
- Botón **"Abrir app ↗"** para ir a localhost:5173

### Cómo funciona la sincronización
La extensión lee los datos directamente desde `localStorage` de la app.
- Si tenés `localhost:5173` abierto → datos en tiempo real
- Si la app está cerrada → usa los últimos datos guardados en caché

Para actualizar el caché, simplemente abrí la app una vez.

---

## Requisitos
- Google Chrome (o Chromium)
- La app corriendo en `http://localhost:5173`

## Actualizar la extensión
Si modificás los archivos, volvé a `chrome://extensions`
y hacé clic en el ícono de recarga (⟳) de la extensión.
