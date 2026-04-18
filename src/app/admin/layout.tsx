'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

type User = { id: string; nom: string; prenom: string; role: string; email: string }

const ROLE_LABELS: Record<string, string> = {
  admin:       "Administrateur",
  secretaire:  "Secrétaire",
  prof:        "Professeur",
  surveillant: "Surveillant",
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u = raw ? JSON.parse(raw) : null
      if (u?.role) {
        setUser(u)
      } else {
        router.replace('/login')
      }
    } catch {
      router.replace('/login')
    }
  }, [router])

  function logout() {
    localStorage.removeItem('eduproof_user')
    router.replace('/login')
  }

  if (!user) return null

  return (
    <>
      <div className="bg-indigo-900 text-white px-4 py-2 flex justify-between items-center text-sm">
        <span className="text-indigo-200">
          {user.prenom} {user.nom}
          <span className="ml-2 bg-indigo-700 px-2 py-0.5 rounded-full text-xs">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </span>
        <button
          onClick={logout}
          className="text-indigo-200 hover:text-white transition"
        >
          Déconnexion →
        </button>
      </div>
      {children}
    </>
  )
}
