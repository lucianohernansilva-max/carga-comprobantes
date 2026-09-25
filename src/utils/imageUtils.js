const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1MB
const QUALITY = 0.8
const MAX_DIMENSION = 1920

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)

      const tryCompress = (quality) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('No se pudo comprimir la imagen')); return }
            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.3) {
              const reader = new FileReader()
              reader.onload = (e) => resolve(e.target.result)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            } else {
              tryCompress(quality - 0.1)
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryCompress(QUALITY)
    }
    img.onerror = reject
    img.src = url
  })
}

export function dataURLtoBase64(dataURL) {
  return dataURL.split(',')[1]
}

export function getMediaType(dataURL) {
  const match = dataURL.match(/^data:([^;]+);/)
  return match ? match[1] : 'image/jpeg'
}
