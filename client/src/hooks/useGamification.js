import { useState, useEffect, useCallback } from 'react'

export function useGamification() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch_ = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gamification')
      setData(await res.json())
    } catch (err) {
      console.error('Gamification fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_() }, [fetch_])

  return { ...data, loading, refresh: fetch_ }
}
