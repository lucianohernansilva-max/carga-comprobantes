import { useState, useEffect, useCallback } from 'react'
import { getReceipts, saveReceipt, deleteReceipt as deleteFromStorage } from '../utils/storage'

export function useReceipts() {
  const [receipts, setReceipts] = useState([])

  useEffect(() => {
    setReceipts(getReceipts())
  }, [])

  const addReceipt = useCallback((receipt) => {
    const saved = saveReceipt(receipt)
    setReceipts(getReceipts())
    return saved
  }, [])

  const updateReceipt = useCallback((receipt) => {
    const saved = saveReceipt(receipt)
    setReceipts(getReceipts())
    return saved
  }, [])

  const deleteReceipt = useCallback((id) => {
    deleteFromStorage(id)
    setReceipts(getReceipts())
  }, [])

  const totalAmount = receipts.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
  const thisMonthReceipts = receipts.filter(r => {
    const now = new Date()
    const d = new Date(r.fecha + 'T00:00:00')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  return { receipts, addReceipt, updateReceipt, deleteReceipt, totalAmount, thisMonthReceipts }
}
