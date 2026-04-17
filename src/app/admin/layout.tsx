'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const user = raw ? JSON.parse(raw) : null
      if (user?.role) {
        setReady(true)
      } else {
        router.replace('/admin/login')
      }
    } catch {
      router.replace('/admin/login')
    }
  }, [router])

  if (!ready) return null

  return <>{children}</>
}
