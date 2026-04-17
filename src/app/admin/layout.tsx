'use client'
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true)
      return
    }
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
  }, [pathname, router])

  if (!ready) return null

  return <>{children}</>
}
