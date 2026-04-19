'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Classe = {
  id: string
  nom: string
  niveau: string
  annee_scolaire: string
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Classe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: "", niveau: "", annee_scolaire: "2025-2026" })
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

  useEffect(() => { loadClasses() }, [])

  async function loadClasses() {
    setLoading(true)
    const { data } = await supabase.from('classes').select('*').order('nom')
    setClasses(data || [])
    setLoading(false)
  }

  async function addClass() {
    if (!form.nom) return
    setSaving(true)
    await supabase.from('classes').insert([form])
    setForm({ nom: "", niveau: "", annee_scolaire: "2025-2026" })
    setShowForm(false)
    setSaving(false)
    loadClasses()
  }

  async function deleteClasse(id: string) {
    if (!confirm("Supprimer cette classe ?")) return
    await supabase.from('classes').delete().eq('id', id)
    loadClasses()
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
          <span className="text-2xl">🏫</span>
          <span className="text-xl font-bold">Classes</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Classes ({classes.length})</h1>
          <button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            + Ajouter une classe
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle classe</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <input placeholder="Nom (ex: Terminale A)" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Niveau (ex: Lycée)" value={form.niveau} onChange={e => setForm({...form, niveau: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Année scolaire" value={form.annee_scolaire} onChange={e => setForm({...form, annee_scolaire: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={addClass} disabled={saving} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button onClick={() => setShowForm(false)} className="w-full sm:w-auto border px-6 py-2 rounded-lg hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : classes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">🏫</p>
            <p>Aucune classe enregistrée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Nom</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Niveau</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Année scolaire</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900">{c.nom}</td>
                    <td className="px-6 py-4 text-gray-700">{c.niveau || "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{c.annee_scolaire || "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteClasse(c.id)} className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
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
