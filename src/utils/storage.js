const KEY = 'carga_comprobantes_v1'

export function getReceipts() {
  try {
    const data = localStorage.getItem(KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveReceipt(receipt) {
  const receipts = getReceipts()
  const existing = receipts.findIndex(r => r.id === receipt.id)
  if (existing >= 0) {
    receipts[existing] = receipt
  } else {
    receipts.unshift(receipt)
  }
  localStorage.setItem(KEY, JSON.stringify(receipts))
  return receipt
}

export function deleteReceipt(id) {
  const receipts = getReceipts().filter(r => r.id !== id)
  localStorage.setItem(KEY, JSON.stringify(receipts))
}

export function getReceipt(id) {
  return getReceipts().find(r => r.id === id) || null
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
