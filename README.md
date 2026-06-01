# VencimientosFi — Gestión de Vencimientos Impositivos

Aplicación de escritorio local para contadores públicos. Gestiona vencimientos de obligaciones impositivas para múltiples clientes, con alertas, estados y exportación a Excel.

## Características

- **100% offline** — todos los datos se almacenan localmente en el navegador (localStorage)
- **Data-driven** — tipos de obligación configurables sin tocar código
- **3 clientes de ejemplo** precargados (Juan García, Agropecuaria del Norte SRL, María López)
- 14 tipos de obligaciones precargadas (IVA, Monotributo, F931, Autónomos, IIBB, etc.)
- Generación automática de vencimientos para 12 meses
- Dashboard con alertas de urgencia por colores
- Exportación a Excel (.xlsx)
- Backup/restauración en JSON

## Instalación rápida

### Requisitos
- Node.js 18 o superior

### Pasos

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd carga-comprobantes

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

Abrir el navegador en `http://localhost:5173`

### Build para producción

```bash
npm run build
npm run preview
```

Los archivos de la aplicación quedan en `dist/`. Se pueden servir con cualquier servidor web estático, o abrir directamente desde archivo (ver nota abajo).

## Uso sin servidor (archivo local)

Para usar la app directamente desde el sistema de archivos (sin `npm run dev`):

1. Ejecutar `npm run build`
2. Servir la carpeta `dist/` con un servidor local simple:
   ```bash
   npx serve dist
   ```
   O instalar como PWA desde el navegador (Chrome/Edge soportan instalación de PWA que funciona offline).

## Estructura del proyecto

```
src/
├── db/
│   ├── store.js        # Capa de almacenamiento (localStorage)
│   ├── fechas.js       # Patrones de cálculo de fechas
│   ├── generador.js    # Generación automática de vencimientos
│   └── seed.js         # Datos iniciales y clientes de ejemplo
├── context/
│   └── AppContext.jsx  # Estado global de la app
├── components/
│   ├── Layout.jsx      # Sidebar + navegación
│   ├── EstadoBadge.jsx
│   └── VencimientoRow.jsx
└── pages/
    ├── Dashboard.jsx
    ├── Clientes.jsx
    ├── ClienteForm.jsx
    ├── ClienteDetalle.jsx
    ├── Vencimientos.jsx
    ├── Historial.jsx
    └── Configuracion.jsx
```

## Patrones de cálculo de fechas

El sistema es completamente **data-driven**. Cada tipo de obligación tiene un `patron`:

| Patrón | Descripción |
|--------|-------------|
| `PATRON_CUIT` | Día del mes según terminación del CUIT (tabla AFIP configurable) |
| `PATRON_DIA_FIJO` | Día fijo del mes (ej: día 20 para Monotributo) |
| `PATRON_SEMESTRAL_FIJO` | Meses fijos del año (ej: enero y julio) |
| `PATRON_DIAS_CIERRE` | N meses después del cierre de ejercicio |
| `PATRON_FECHA_PROVINCIA` | Día configurable por provincia (IIBB local) |
| `PATRON_PERSONALIZADO` | Fechas ingresadas manualmente |

Para agregar un nuevo tipo de obligación: solo crear el registro desde **Configuración → Nuevo tipo**. No requiere cambios de código.

## Actualización de tablas AFIP

Cuando AFIP publica el nuevo calendario fiscal:
1. Ir a **Configuración → Tabla de vencimientos AFIP**
2. Seleccionar el tipo (IVA, Autónomos, F931, etc.)
3. Actualizar el día de vencimiento para cada terminación de CUIT (0-9)
4. Guardar

## Backup de datos

- **Exportar**: Configuración → Exportar backup (.json)
- **Importar**: Configuración → Restaurar backup

El archivo JSON contiene todos los clientes, vencimientos y configuración.

## Agregar Electron (opcional — para .exe de Windows)

Si querés empaquetar como aplicación de escritorio:

```bash
npm install --save-dev electron electron-builder
```

Crear `electron/main.cjs`:
```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1280, height: 800, webPreferences: { nodeIntegration: false } })
  win.loadFile(path.join(__dirname, '../dist/index.html'))
})
```

Agregar en `package.json`:
```json
"main": "electron/main.cjs",
"scripts": {
  "electron": "npm run build && electron .",
  "dist": "npm run build && electron-builder"
}
```

---

## Acceso remoto con Cloudflare Tunnel (Windows)

Con Cloudflare Tunnel podés acceder a la app desde cualquier dispositivo con internet (celular, otra PC, etc.) sin abrir puertos en el router ni depender de la IP de tu casa. **La PC tiene que estar encendida.**

### Paso 1 — Instalar `cloudflared` en Windows

1. Descargar el instalador desde:
   `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi`
2. Ejecutar el `.msi` y seguir el instalador.
3. Verificar en PowerShell:
   ```powershell
   cloudflared --version
   ```

### Paso 2 — Correr la app localmente

En la carpeta del proyecto, abrir PowerShell:
```powershell
npm install
npm run dev
```
La app queda escuchando en `http://localhost:5173`.

### Paso 3 — Crear el túnel (modo rápido, sin cuenta)

En otra ventana de PowerShell:
```powershell
cloudflared tunnel --url http://localhost:5173
```

Cloudflare te devuelve una URL del tipo:
```
https://algo-random-aqui.trycloudflare.com
```
Esa URL funciona desde cualquier dispositivo con internet. **La URL cambia cada vez que reiniciás el túnel.**

### Paso 4 — URL fija (requiere cuenta gratuita en Cloudflare)

Para tener siempre la misma URL (ej: `vencimientos.tunombre.com`):

1. Crear cuenta gratuita en `https://cloudflare.com`
2. Autenticarse:
   ```powershell
   cloudflared tunnel login
   ```
3. Crear el túnel con nombre fijo:
   ```powershell
   cloudflared tunnel create vencimientosfi
   ```
4. Crear el archivo de configuración `C:\Users\TuUsuario\.cloudflared\config.yml`:
   ```yaml
   tunnel: vencimientosfi
   credentials-file: C:\Users\TuUsuario\.cloudflared\<id-del-tunnel>.json
   ingress:
     - hostname: vencimientos.tudominio.com
       service: http://localhost:5173
     - service: http_status:404
   ```
5. Enrutar el dominio:
   ```powershell
   cloudflared tunnel route dns vencimientosfi vencimientos.tudominio.com
   ```
6. Iniciar el túnel:
   ```powershell
   cloudflared tunnel run vencimientosfi
   ```

### Paso 5 — Arrancar automáticamente con Windows

Para que el túnel y la app arranquen solos al encender la PC:

1. Instalar `cloudflared` como servicio de Windows:
   ```powershell
   cloudflared service install
   ```
2. Crear un acceso directo en la carpeta de inicio de Windows
   (`shell:startup`) con el comando:
   ```
   cmd /c "cd /d C:\ruta\a\vencimientosfi && npm run dev"
   ```

### Seguridad con Cloudflare Access (opcional pero recomendado)

Cloudflare ofrece una capa extra de autenticación por email antes de mostrar la app:
1. En el dashboard de Cloudflare → **Zero Trust** → **Access** → **Applications**
2. Crear una aplicación del tipo "Self-hosted" apuntando a tu URL
3. Configurar política: solo el email del contador puede acceder

Esto agrega autenticación por link mágico **además** de la contraseña de la app.

---

## Licencia

Uso privado.
