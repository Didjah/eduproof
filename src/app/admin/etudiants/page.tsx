'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Etudiant = {
  id: string
  nom: string
  prenom: string
  email: string
  whatsapp: string
  statut: string
  created_at: string
}

export default function EtudiantsPage() {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", whatsapp: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadEtudiants() }, [])

  async function loadEtudiants() {
    setLoading(true)
    const { data } = await supabase.from('etudiants').select('*').order('created_at', { ascending: false })
    setEtudiants(data || [])
    setLoading(false)
  }

  async function addEtudiant() {
    if (!form.nom || !form.prenom) return
    setSaving(true)
    await supabase.from('etudiants').insert([{ ...form, statut: 'actif' }])
    setForm({ nom: "", prenom: "", email: "", whatsapp: "" })
    setShowForm(false)
    setSaving(false)
    loadEtudiants()
  }

  async function deleteEtudiant(id: string) {
    if (!confirm("Supprimer cet étudiant ?")) return
    await supabase.from('etudiants').delete().eq('id', id)
    loadEtudiants()
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👨‍🎓</span>
          <span className="text-xl font-bold">Étudiants</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Liste des étudiants ({etudiants.length})</h1>
          <button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            + Ajouter un étudiant
          </button>
        </div>

        {/* Formulaire ajout */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvel étudiant</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input placeholder="Nom *" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Prénom *" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="WhatsApp" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={addEtudiant} disabled={saving} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button onClick={() => setShowForm(false)} className="w-full sm:w-auto border px-6 py-2 rounded-lg hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : etudiants.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">👨‍🎓</p>
            <p>Aucun étudiant enregistré. Ajoutez le premier !</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Nom</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Prénom</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">WhatsApp</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {etudiants.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900">{e.nom}</td>
                    <td className="px-6 py-4 text-gray-700">{e.prenom}</td>
                    <td className="px-6 py-4 text-gray-500">{e.email || "—"}</td>
                    <td className="px-6 py-4 text-gray-500">{e.whatsapp || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">{e.statut}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteEtudiant(e.id)} className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
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
