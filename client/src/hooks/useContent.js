import { useState, useEffect, useCallback } from 'react'

export function useContent() {
  const [pieces, setPieces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPieces = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      const res = await fetch(`/api/content?${params}`)
      const data = await res.json()
      setPieces(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const movePiece = useCallback(async (filename, from, to) => {
    const res = await fetch('/api/pipeline/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, from, to }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    const data = await res.json()
    await fetchPieces()
    return data
  }, [fetchPieces])

  const getPiece = useCallback(async (filename) => {
    const res = await fetch(`/api/content/${encodeURIComponent(filename)}`)
    if (!res.ok) throw new Error('Pieza no encontrada')
    return res.json()
  }, [])

  const updatePiece = useCallback(async (filename, updates) => {
    const res = await fetch(`/api/content/${encodeURIComponent(filename)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  }, [])

  useEffect(() => { fetchPieces() }, [fetchPieces])

  return { pieces, loading, error, fetchPieces, movePiece, getPiece, updatePiece }
}
