'use client'
import { useEffect, useState } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    setAuth(localStorage.getItem('eduproof_admin') === 'true')
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password === 'admin2026') {
      localStorage.setItem('eduproof_admin', 'true')
      setAuth(true)
      setError(false)
    } else {
      setError(true)
      setPassword("")
    }
  }

  if (auth === null) return null

  if (!auth) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-700 text-white rounded-2xl w-14 h-14 flex items-center justify-center text-2xl font-bold mb-3">
              E
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EduProof</h1>
            <p className="text-sm text-gray-500 mt-1">Espace administrateur</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false) }}
                placeholder="••••••••"
                autoFocus
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">Mot de passe incorrect</p>
            )}

            <button
              type="submit"
              className="bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Connexion
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
