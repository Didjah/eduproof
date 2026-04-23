'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Entry = {
  id: string
  classe_id: string
  matiere_id: string
  utilisateur_id: string | null
  type: string
  titre: string
  contenu: string
  date: string
  date_limite: string | null
  created_at: string
  classes: { nom: string } | null
  matieres: { nom: string } | null
}

type Classe  = { id: string; nom: string }
type Matiere = { id: string; nom: string }

const TYPE_STYLES: Record<string, string> = {
  Cours:  "bg-blue-100 text-blue-700",
  Devoir: "bg-orange-100 text-orange-700",
  Examen: "bg-red-100 text-red-700",
}

export default function CahierPage() {
  const [entries, setEntries]     = useState<Entry[]>([])
  const [classes, setClasses]     = useState<Classe[]>([])
  const [matieres, setMatieres]   = useState<Matiere[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [userId, setUserId]       = useState<string | null>(null)

  const [filterClasse,  setFilterClasse]  = useState("")
  const [filterMatiere, setFilterMatiere] = useState("")

  const [form, setForm] = useState({
    classe_id:   "",
    matiere_id:  "",
    type:        "Cours",
    titre:       "",
    contenu:     "",
    date:        new Date().toISOString().split('T')[0],
    date_limite: "",
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const u   = raw ? JSON.parse(raw) : null
      if (u?.id) setUserId(u.id)
    } catch { /* ignore */ }

    loadEntries()
    supabase.from('classes').select('id,nom').order('nom').then(({ data }) => setClasses(data || []))
    supabase.from('matieres').select('id,nom').order('nom').then(({ data }) => setMatieres(data || []))
  }, [])

  async function loadEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('cahier_textes')
      .select('*, classes(nom), matieres(nom)')
      .order('date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  async function addEntry() {
    if (!form.classe_id || !form.matiere_id || !form.titre || !form.contenu) return
    setSaving(true)
    await supabase.from('cahier_textes').insert([{
      classe_id:      form.classe_id,
      matiere_id:     form.matiere_id,
      utilisateur_id: userId,
      type:           form.type,
      titre:          form.titre,
      contenu:        form.contenu,
      date:           form.date,
      date_limite:    form.date_limite || null,
    }])
    setForm({
      classe_id: "", matiere_id: "", type: "Cours",
      titre: "", contenu: "",
      date: new Date().toISOString().split('T')[0],
      date_limite: "",
    })
    setShowForm(false)
    setSaving(false)
    loadEntries()
  }

  async function deleteEntry(id: string) {
    if (!confirm("Supprimer cette entrée ?")) return
    await supabase.from('cahier_textes').delete().eq('id', id)
    loadEntries()
  }

  const filtered = entries.filter(e =>
    (!filterClasse  || e.classe_id  === filterClasse) &&
    (!filterMatiere || e.matiere_id === filterMatiere)
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📓</span>
          <span className="text-xl font-bold">Cahier de textes</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8">

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row gap-3">
          <select
            value={filterClasse}
            onChange={e => setFilterClasse(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Toutes les classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select
            value={filterMatiere}
            onChange={e => setFilterMatiere(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Toutes les matières</option>
            {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Entrées ({filtered.length})</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + Ajouter une entrée
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle entrée</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select
                value={form.classe_id}
                onChange={e => setForm({ ...form, classe_id: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <select
                value={form.matiere_id}
                onChange={e => setForm({ ...form, matiere_id: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Sélectionner une matière</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option>Cours</option>
                <option>Devoir</option>
                <option>Examen</option>
              </select>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="sm:col-span-2">
                <input
                  placeholder="Titre"
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="sm:col-span-2">
                <textarea
                  placeholder={form.type === 'Cours' ? "Résumé du cours..." : "Description du travail à faire..."}
                  value={form.contenu}
                  onChange={e => setForm({ ...form, contenu: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
              {(form.type === 'Devoir' || form.type === 'Examen') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                  <input
                    type="date"
                    value={form.date_limite}
                    onChange={e => setForm({ ...form, date_limite: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={addEntry}
                disabled={saving}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
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

        {/* Entries list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📓</p>
            <p>Aucune entrée enregistrée.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLES[e.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {e.type}
                      </span>
                      <span className="text-sm text-gray-400">{e.date}</span>
                      {e.date_limite && (
                        <span className="text-xs text-red-500 font-medium">→ Pour le {e.date_limite}</span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">{e.titre}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{e.contenu}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {e.classes?.nom && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-medium">
                          🏫 {e.classes.nom}
                        </span>
                      )}
                      {e.matieres?.nom && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                          📚 {e.matieres.nom}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEntry(e.id)}
                    className="text-red-400 hover:text-red-600 text-sm shrink-0"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
