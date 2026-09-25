import Anthropic from '@anthropic-ai/sdk'
import { dataURLtoBase64, getMediaType } from '../utils/imageUtils'

const SYSTEM_PROMPT = `Sos un asistente especializado en leer comprobantes fiscales argentinos.
Analizá la imagen y extraé los siguientes datos en formato JSON:
{
  "cuit": "string (solo números, sin guiones)",
  "razon_social": "string",
  "fecha": "string (DD/MM/AAAA)",
  "tipo_comprobante": "string (A, B o C)",
  "numero_comprobante": "string (formato XXXX-XXXXXXXX)",
  "importe_total": "number",
  "iva_discriminado": "number o null"
}
Si un campo no está visible o no podés determinarlo con certeza, usá null.
No inventes datos. Respondé SOLO con el JSON, sin texto adicional.`

function getClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'API key no configurada. Creá un archivo .env con VITE_ANTHROPIC_API_KEY=tu-key'
    )
  }
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

export async function extractReceiptData(imageDataURL) {
  const client = getClient()
  const base64 = dataURLtoBase64(imageDataURL)
  const mediaType = getMediaType(imageDataURL)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: 'Extraé los datos de este comprobante fiscal argentino.',
          },
        ],
      },
    ],
  })

  const raw = response.content[0].text.trim()
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  try {
    return JSON.parse(jsonText)
  } catch {
    throw new Error('No se pudo interpretar la respuesta del OCR. Intentá con otra foto.')
  }
}
