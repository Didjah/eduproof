'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: "", pin: "" })
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setLoading(true)

    const { data } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, role, email')
      .eq('email', form.email.trim().toLowerCase())
      .eq('pin', form.pin)
      .single()

    setLoading(false)

    if (data) {
      localStorage.setItem('eduproof_user', JSON.stringify(data))
      router.push('/admin')
    } else {
      setError(true)
      setForm(f => ({ ...f, pin: "" }))
    }
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-700 text-white rounded-2xl w-14 h-14 flex items-center justify-center text-2xl font-bold mb-3">
            E
          </div>
          <h1 className="text-2xl font-bold text-gray-900">EduProof</h1>
          <p className="text-sm text-gray-500 mt-1">Connexion administrateur</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="text"
              value={form.email}
              onChange={e => { setForm({ ...form, email: e.target.value }); setError(false) }}
              placeholder="votre@email.com"
              autoFocus
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe / PIN
            </label>
            <input
              type="password"
              value={form.pin}
              onChange={e => { setForm({ ...form, pin: e.target.value }); setError(false) }}
              placeholder="••••••••"
              required
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-900"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">Identifiants incorrects</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Vérification..." : "Connexion"}
          </button>
        </form>
      </div>
    </div>
  )
}
