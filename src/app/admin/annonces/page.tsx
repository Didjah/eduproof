'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { msgAnnonce } from "@/utils/whatsapp"

type Annonce = {
  id: string
  titre: string
  contenu: string
  cible: 'tous' | 'parents' | 'etudiants'
  date: string
}

const CIBLE_STYLES: Record<string, string> = {
  tous:      "bg-green-100 text-green-700",
  parents:   "bg-blue-100 text-blue-700",
  etudiants: "bg-purple-100 text-purple-700",
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titre: "", contenu: "", cible: "tous" as Annonce['cible'], date: today() })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAnnonces() }, [])

  async function loadAnnonces() {
    setLoading(true)
    const { data } = await supabase.from('annonces').select('*').order('date', { ascending: false })
    setAnnonces(data || [])
    setLoading(false)
  }

  async function addAnnonce() {
    if (!form.titre.trim() || !form.contenu.trim()) return
    setSaving(true)
    await supabase.from('annonces').insert([form])
    setForm({ titre: "", contenu: "", cible: "tous", date: today() })
    setShowForm(false)
    setSaving(false)
    loadAnnonces()
  }

  async function deleteAnnonce(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return
    await supabase.from('annonces').delete().eq('id', id)
    loadAnnonces()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📢</span>
          <span className="text-xl font-bold">Annonces</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Annonces ({annonces.length})</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + Nouvelle annonce
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle annonce</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <input
                placeholder="Titre"
                value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={form.cible}
                onChange={e => setForm({ ...form, cible: e.target.value as Annonce['cible'] })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="tous">Tous</option>
                <option value="parents">Parents</option>
                <option value="etudiants">Étudiants</option>
              </select>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <textarea
              placeholder="Contenu de l'annonce..."
              value={form.contenu}
              onChange={e => setForm({ ...form, contenu: e.target.value })}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={addAnnonce}
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
        ) : annonces.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📢</p>
            <p>Aucune annonce enregistrée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[550px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Titre</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Contenu</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Cible</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {annonces.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900 max-w-[180px] truncate">{a.titre}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm max-w-[240px]">
                      {a.contenu.length > 50 ? a.contenu.slice(0, 50) + "…" : a.contenu}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${CIBLE_STYLES[a.cible] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.cible}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                      {new Date(a.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => window.open('https://wa.me/?text=' + encodeURIComponent(msgAnnonce(a.titre, a.contenu)), '_blank')}
                        className="text-green-600 hover:text-green-800 text-sm mr-3"
                        title="Envoyer aux parents via WhatsApp"
                      >📲 Envoyer</button>
                      <button
                        onClick={() => deleteAnnonce(a.id)}
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
