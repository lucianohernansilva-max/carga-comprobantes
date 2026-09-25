# Carga Comprobantes

PWA mobile-first para digitalizar comprobantes fiscales argentinos con la cámara del celular y exportar a Excel para SOS Contador.

## Funcionalidades

- **OCR con IA**: Fotografiás el comprobante y Claude Vision extrae automáticamente CUIT, razón social, fecha, tipo, número e importes
- **Revisión editable**: Formulario pre-completado para corregir errores del OCR antes de confirmar
- **Sesión persistente**: Los comprobantes se guardan en localStorage aunque recargues la página
- **Exportar a Excel**: Genera un `.xlsx` compatible con SOS Contador con formato numérico, encabezados en negrita y fila de totales
- **PWA instalable**: Se puede instalar en el home screen de Android/iOS

## Requisitos

- Node.js 18+
- API key de Anthropic ([obtené la tuya acá](https://console.anthropic.com/))

## Instalación

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd carga-comprobantes

# 2. Instalar dependencias
npm install

# 3. Configurar la API key
cp .env.example .env
# Editar .env y poner tu API key:
# VITE_ANTHROPIC_API_KEY=sk-ant-...

# 4. Correr en modo desarrollo
npm run dev
```

La app queda disponible en `http://localhost:5173`.

Para probarlo en el celular desde la misma red:
```bash
npm run dev -- --host
# Accedé desde el celular a http://192.168.x.x:5173
```

## Build de producción

```bash
npm run build
npm run preview
```

## Estructura del proyecto

```
src/
├── components/
│   ├── CameraCapture.jsx   # Visor de cámara con captura y galería
│   ├── Header.jsx          # Encabezado con contador y botón exportar
│   ├── LoadingSpinner.jsx  # Overlay de carga durante OCR
│   ├── ReceiptItem.jsx     # Item individual de la lista
│   ├── ReceiptList.jsx     # Lista de comprobantes / estado vacío
│   └── ReviewForm.jsx      # Formulario editable post-OCR
├── hooks/
│   └── useLocalStorage.js  # Persistencia de sesión
├── services/
│   ├── anthropicService.js # Llamada a Claude Vision (OCR)
│   └── excelService.js     # Generación del archivo .xlsx
├── utils/
│   └── imageUtils.js       # Compresión de imágenes (máx 1MB)
├── App.jsx                 # Máquina de estados principal
└── main.jsx
```

## Seguridad de la API key

La API key se expone en el bundle del cliente (es inherente a una app sin backend). Para uso en producción con múltiples usuarios se recomienda agregar un proxy backend mínimo. Para uso personal/empresarial propio en el celular, esto es aceptable.

## Columnas del Excel exportado

| CUIT | Razón Social | Fecha | Tipo | N° Comprobante | Importe Total | IVA | Observaciones |

- Nombre del archivo: `comprobantes_YYYY-MM-DD_HHmm.xlsx`
- Primera fila en negrita con fondo azul
- Fila de TOTAL al final con fondo amarillo
- Importes con formato `#,##0.00`

## Compatibilidad

Testeado en Chrome mobile (Android) y Safari (iOS). La cámara trasera se activa automáticamente en dispositivos móviles. En desktop se puede subir imagen desde archivo.
