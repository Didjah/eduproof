'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Matiere = {
  id: string
  nom: string
  coefficient: number
  type: 'cours' | 'TP' | 'stage'
}

const TYPE_STYLES: Record<string, string> = {
  cours:  "bg-blue-100 text-blue-700",
  TP:     "bg-emerald-100 text-emerald-700",
  stage:  "bg-orange-100 text-orange-700",
}

export default function MatieresPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: "", coefficient: 1, type: "cours" as Matiere['type'] })
  const [saving, setSaving] = useState(false)
  const [accesRefuse, setAccesRefuse] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const user = raw ? JSON.parse(raw) : null
      if (!user || !['admin', 'directeur', 'prof', 'surveillant'].includes(user.role))
        setAccesRefuse(true)
    } catch { setAccesRefuse(true) }
  }, [])

  useEffect(() => { loadMatieres() }, [])

  async function loadMatieres() {
    setLoading(true)
    const { data } = await supabase.from('matieres').select('*').order('nom')
    setMatieres(data || [])
    setLoading(false)
  }

  async function addMatiere() {
    if (!form.nom.trim()) return
    setSaving(true)
    await supabase.from('matieres').insert([form])
    setForm({ nom: "", coefficient: 1, type: "cours" })
    setShowForm(false)
    setSaving(false)
    loadMatieres()
  }

  async function deleteMatiere(id: string) {
    if (!confirm("Supprimer cette matière ?")) return
    await supabase.from('matieres').delete().eq('id', id)
    loadMatieres()
  }

  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Votre rôle ne vous permet pas d'accéder à cette page.</p>
        <Link href="/admin/finances" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Aller aux finances
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="text-xl font-bold">Matières</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Matières ({matieres.length})</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + Ajouter une matière
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle matière</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                placeholder="Nom (ex: Mathématiques)"
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="number"
                min={1}
                placeholder="Coefficient"
                value={form.coefficient}
                onChange={e => setForm({ ...form, coefficient: Number(e.target.value) })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as Matiere['type'] })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="cours">Cours</option>
                <option value="TP">TP</option>
                <option value="stage">Stage</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={addMatiere}
                disabled={saving}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="w-full sm:w-auto border px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : matieres.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📚</p>
            <p>Aucune matière enregistrée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Nom</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Coefficient</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Type</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {matieres.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900">{m.nom}</td>
                    <td className="px-6 py-4 text-gray-700">{m.coefficient}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${TYPE_STYLES[m.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteMatiere(m.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
