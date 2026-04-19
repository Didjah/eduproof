'use client'
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { ouvrirWhatsApp, msgPaiement } from "@/utils/whatsapp"

type Paiement = {
  id: string
  montant: number
  type: string
  statut: string
  date_paiement: string
  etudiants: { nom: string; prenom: string; parent?: { telephone: string } | null } | null
}

export default function FinancesPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [etudiants, setEtudiants] = useState<{id:string;nom:string;prenom:string}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ etudiant_id: "", montant: "", type: "Scolarité", statut: "paye", date_paiement: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [accesRefuse, setAccesRefuse] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eduproof_user')
      const user = raw ? JSON.parse(raw) : null
      if (!user || !['admin', 'directeur', 'secretaire'].includes(user.role))
        setAccesRefuse(true)
    } catch { setAccesRefuse(true) }
  }, [])

  const total = paiements.reduce((s, p) => s + (p.montant || 0), 0)
  const payes = paiements.filter(p => p.statut === 'paye').reduce((s, p) => s + (p.montant || 0), 0)
  const enAttente = paiements.filter(p => p.statut === 'en_attente').reduce((s, p) => s + (p.montant || 0), 0)

  useEffect(() => {
    loadPaiements()
    supabase.from('etudiants').select('id,nom,prenom').order('nom').then(({ data }) => setEtudiants(data || []))
  }, [])

  async function loadPaiements() {
    setLoading(true)
    const { data } = await supabase.from('paiements').select('*, etudiants(nom,prenom,parent:utilisateurs!parent_id(telephone))').order('date_paiement', { ascending: false })
    setPaiements(data || [])
    setLoading(false)
  }

  async function addPaiement() {
    if (!form.etudiant_id || !form.montant) return
    setSaving(true)
    await supabase.from('paiements').insert([{ ...form, montant: parseFloat(form.montant) }])
    setForm({ etudiant_id: "", montant: "", type: "Scolarité", statut: "paye", date_paiement: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    setSaving(false)
    loadPaiements()
  }

  if (accesRefuse) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center max-w-sm w-full">
        <p className="text-5xl mb-4">🔒</p>
        <p className="text-xl font-bold text-gray-800 mb-2">Accès non autorisé</p>
        <p className="text-sm text-gray-500 mb-6">Votre rôle ne vous permet pas d'accéder à cette page.</p>
        <Link href="/admin" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          ← Retour au dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-indigo-700 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold">Finances</span>
        </div>
        <Link href="/admin" className="text-indigo-200 hover:text-white text-sm">← Dashboard</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Total encaissé", value: total, color: "bg-indigo-600" },
            { label: "Payé", value: payes, color: "bg-green-600" },
            { label: "En attente", value: enAttente, color: "bg-yellow-500" },
          ].map((s, i) => (
            <div key={i} className={`${s.color} text-white rounded-2xl p-6`}>
              <p className="text-3xl font-bold">{s.value.toLocaleString()} FCFA</p>
              <p className="text-sm opacity-80 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Paiements ({paiements.length})</h1>
          <button onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
            + Enregistrer un paiement
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold mb-4">Nouveau paiement</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select value={form.etudiant_id} onChange={e => setForm({...form, etudiant_id: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">Sélectionner un étudiant</option>
                {etudiants.map(e => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
              </select>
              <input type="number" placeholder="Montant (FCFA)" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option>Scolarité</option>
                <option>Inscription</option>
                <option>Examen</option>
                <option>Autre</option>
              </select>
              <select value={form.statut} onChange={e => setForm({...form, statut: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="paye">Payé</option>
                <option value="en_attente">En attente</option>
                <option value="partiel">Partiel</option>
              </select>
              <input type="date" value={form.date_paiement} onChange={e => setForm({...form, date_paiement: e.target.value})}
                className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button onClick={addPaiement} disabled={saving} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button onClick={() => setShowForm(false)} className="w-full sm:w-auto border px-6 py-2 rounded-lg hover:bg-gray-50">Annuler</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : paiements.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">💰</p>
            <p>Aucun paiement enregistré.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full min-w-[550px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Étudiant</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Montant</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Statut</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paiements.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.etudiants ? p.etudiants.nom + ' ' + p.etudiants.prenom : '—'}</td>
                    <td className="px-6 py-4 text-gray-700">{p.type}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{p.montant?.toLocaleString()} FCFA</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.statut === 'paye' ? 'bg-green-100 text-green-700' :
                        p.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-orange-100 text-orange-700'}`}>
                        {p.statut === 'paye' ? 'Payé' : p.statut === 'en_attente' ? 'En attente' : 'Partiel'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{p.date_paiement}</td>
                    <td className="px-6 py-4 text-center">
                      {(p.statut === 'en_attente' || p.statut === 'partiel') && p.etudiants?.parent?.telephone && (
                        <button
                          onClick={() => ouvrirWhatsApp(p.etudiants!.parent!.telephone, msgPaiement(p.etudiants!.prenom, p.etudiants!.nom, p.montant.toLocaleString(), p.type))}
                          className="text-green-600 hover:text-green-800 text-xl"
                          title="Rappel paiement WhatsApp"
                        >📲</button>
                      )}
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
