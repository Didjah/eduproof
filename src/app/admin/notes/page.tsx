'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { ouvrirWhatsApp, msgNotes } from "@/utils/whatsapp"

type Note = {
  id: string
  valeur: number
  type_eval: string
  date: string
  commentaire: string
  etudiant_id: string
  matiere_id: string
}

type Etudiant = { id: string; nom: string; prenom: string; parent?: Array<{ telephone?: string }> | null }
type Matiere = { id: string; nom: string; coefficient: number }

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accesRefuse, setAccesRefuse] = useState(false)
  const [form, setForm] = useState({
    etudiant_id: "",
    matiere_id: "",
    valeur: "",
    type_eval: "Devoir",
    date: new Date().toISOString().split('T')[0],
    commentaire: "",
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const user = raw ? JSON.parse(raw) : null
      if (!user || !['admin', 'directeur', 'prof', 'surveillant'].includes(user.role))
        setAccesRefuse(true)
    } catch { setAccesRefuse(true) }
  }, [])

  useEffect(() => {
    loadNotes()
    supabase.from('etudiants').select('id,nom,prenom,parent:utilisateurs!parent_id(telephone)').order('nom').then(({ data }) => setEtudiants(data || []))
    supabase.from('matieres').select('*').order('nom').then(({ data }) => setMatieres(data || []))
  }, [])

  async function loadNotes() {
    setLoading(true)
    const { data } = await supabase.from('notes').select('*').order('date', { ascending: false })
    setNotes(data || [])
    setLoading(false)
  }

  async function addNote() {
    if (!form.etudiant_id || !form.matiere_id || !form.valeur) return
    setSaving(true)
    await supabase.from('notes').insert([{ ...form, valeur: parseFloat(form.valeur) }])
    setForm({ etudiant_id: "", matiere_id: "", valeur: "", type_eval: "Devoir", date: new Date().toISOString().split('T')[0], commentaire: "" })
    setShowForm(false)
    setSaving(false)
    loadNotes()
  }

  const moyenne = notes.length > 0
    ? (notes.reduce((s, n) => s + n.valeur, 0) / notes.length).toFixed(2)
    : "—"
  const nbMatieres = new Set(notes.map(n => n.matiere_id)).size

  const getEtudiant = (id: string) => etudiants.find(e => e.id === id)
  const getMatiere = (id: string) => matieres.find(m => m.id === id)

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
          <span className="text-2xl">📊</span>
          <span className="text-xl font-bold">Notes</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Total notes", value: notes.length, color: "bg-indigo-600" },
            { label: "Moyenne générale", value: moyenne, color: "bg-blue-600" },
            { label: "Matières évaluées", value: nbMatieres, color: "bg-violet-600" },
          ].map((s, i) => (
            <div key={i} className={`${s.color} text-white rounded-2xl p-6`}>
              <p className="text-3xl font-bold">{s.value}</p>
              <p className="text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notes ({notes.length})</h1>
          <button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            + Ajouter une note
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouvelle note</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select value={form.etudiant_id} onChange={e => setForm({ ...form, etudiant_id: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Sélectionner un étudiant</option>
                {etudiants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <select value={form.matiere_id} onChange={e => setForm({ ...form, matiere_id: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Sélectionner une matière</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
              <input type="number" min="0" max="20" step="0.25" placeholder="Note /20" value={form.valeur}
                onChange={e => setForm({ ...form, valeur: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <select value={form.type_eval} onChange={e => setForm({ ...form, type_eval: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option>Devoir</option>
                <option>Examen</option>
                <option>Contrôle</option>
                <option>TP</option>
                <option>Oral</option>
              </select>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <input placeholder="Commentaire (optionnel)" value={form.commentaire}
                onChange={e => setForm({ ...form, commentaire: e.target.value })}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={addNote} disabled={saving}
                className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button onClick={() => setShowForm(false)} className="w-full sm:w-auto border px-6 py-2 rounded-lg hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📊</p>
            <p>Aucune note enregistrée.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Étudiant</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Matière</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Note</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Commentaire</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {notes.map((n, i) => {
                  const etudiant = getEtudiant(n.etudiant_id)
                  const matiere = getMatiere(n.matiere_id)
                  return (
                    <tr key={n.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {etudiant ? `${etudiant.nom} ${etudiant.prenom}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{matiere?.nom ?? "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-lg ${n.valeur >= 10 ? 'text-green-600' : 'text-red-600'}`}>
                          {n.valeur}/20
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{n.type_eval}</td>
                      <td className="px-6 py-4 text-gray-500">{n.date}</td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{n.commentaire || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        {etudiant?.parent?.[0]?.telephone && (
                          <button
                            onClick={() => ouvrirWhatsApp(etudiant.parent![0].telephone!, msgNotes(etudiant.prenom, etudiant.nom, matiere?.nom ?? '', n.valeur))}
                            className="text-green-600 hover:text-green-800 text-xl"
                            title="Notifier le parent"
                          >📲</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
